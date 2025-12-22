/**
 * 简易内存限流（按进程实例）。
 * 说明：在无外部缓存（Redis）情况下，用于降低暴力破解/DoS 风险；在多实例部署下为"尽力而为"。
 * 
 * 安全注意事项：
 * 1. 生产环境建议使用 Redis 等分布式缓存实现跨实例限流
 * 2. IP 获取依赖反向代理正确配置 X-Forwarded-For
 * 3. 定期清理过期记录防止内存泄漏
 */
import type { NextRequest } from 'next/server';

type Bucket = {
  count: number;
  resetAt: number; // ms
  firstRequestAt: number; // 用于检测异常模式
};

const buckets = new Map<string, Bucket>();

// 配置常量
const MAX_BUCKETS = 10000;          // 最大桶数量
const CLEANUP_THRESHOLD = 5000;     // 触发清理的阈值
const SUSPICIOUS_RATE_THRESHOLD = 100; // 可疑请求速率阈值（每分钟）

// 上次清理时间
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL = 60 * 1000; // 最少间隔1分钟清理一次

function cleanup(now: number, force = false) {
  // 避免频繁清理
  if (!force && now - lastCleanupTime < CLEANUP_INTERVAL) {
    return;
  }
  
  lastCleanupTime = now;
  
  // 过期清理
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * 验证 IP 地址格式
 */
function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (简化版)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(p => p >= 0 && p <= 255);
  }
  
  return ipv6Regex.test(ip);
}

/**
 * 获取客户端真实 IP
 * 安全改进：验证 IP 格式，防止注入攻击
 */
export function getClientIp(request: NextRequest): string {
  // 在生产环境，应该验证请求是否来自可信代理
  // 这里简化处理，实际部署时需要根据架构配置
  
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // 获取第一个 IP（最接近客户端的）
    const first = forwarded.split(',')[0]?.trim();
    if (first && isValidIp(first)) {
      return first;
    }
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return realIp;
  }
  
  // 如果无法获取有效 IP，返回一个标识符
  // 这会导致所有无法识别来源的请求共享一个限流桶
  return 'unknown-client';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;      // 剩余请求次数
  suspicious: boolean;    // 是否可疑（请求频率异常高）
}

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();

  // 控制 Map 增长
  if (buckets.size > CLEANUP_THRESHOLD) {
    cleanup(now);
  }
  
  // 硬性上限保护
  if (buckets.size > MAX_BUCKETS) {
    cleanup(now, true);
    // 如果清理后仍然过多，拒绝新的请求（保护内存）
    if (buckets.size > MAX_BUCKETS) {
      return { allowed: false, retryAfterMs: 60000, remaining: 0, suspicious: true };
    }
  }

  const bucket = buckets.get(params.key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(params.key, { 
      count: 1, 
      resetAt: now + params.windowMs,
      firstRequestAt: now
    });
    return { allowed: true, retryAfterMs: 0, remaining: params.limit - 1, suspicious: false };
  }

  // 检测可疑行为：短时间内大量请求
  const elapsedMs = now - bucket.firstRequestAt;
  const requestsPerMinute = elapsedMs > 0 ? (bucket.count * 60000) / elapsedMs : bucket.count;
  const suspicious = requestsPerMinute > SUSPICIOUS_RATE_THRESHOLD;

  if (bucket.count >= params.limit) {
    return { 
      allowed: false, 
      retryAfterMs: Math.max(0, bucket.resetAt - now),
      remaining: 0,
      suspicious
    };
  }

  bucket.count += 1;
  return { 
    allowed: true, 
    retryAfterMs: 0, 
    remaining: params.limit - bucket.count,
    suspicious
  };
}

export function buildRateLimitKey(request: NextRequest, name: string, extra?: string[]): string {
  const ip = getClientIp(request);
  const parts = ['rl', name, ip, ...(extra || [])];
  return parts.join(':');
}

/**
 * 重置指定 key 的限流计数（用于测试或管理目的）
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * 获取当前限流状态（用于监控）
 */
export function getRateLimitStats(): { bucketCount: number; oldestBucket: number | null } {
  let oldest: number | null = null;
  for (const bucket of buckets.values()) {
    if (oldest === null || bucket.firstRequestAt < oldest) {
      oldest = bucket.firstRequestAt;
    }
  }
  return { bucketCount: buckets.size, oldestBucket: oldest };
}
