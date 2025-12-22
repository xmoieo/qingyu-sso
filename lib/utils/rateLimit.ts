/**
 * 简易内存限流（按进程实例）。
 * 说明：在无外部缓存（Redis）情况下，用于降低暴力破解/DoS 风险；在多实例部署下为“尽力而为”。
 */
import type { NextRequest } from 'next/server';

type Bucket = {
  count: number;
  resetAt: number; // ms
};

const buckets = new Map<string, Bucket>();

function cleanup(now: number) {
  // 过期清理（简单遍历；项目体量下足够）
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();

  // 控制 Map 增长
  if (buckets.size > 5000) {
    cleanup(now);
  }

  const bucket = buckets.get(params.key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(params.key, { count: 1, resetAt: now + params.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= params.limit) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function buildRateLimitKey(request: NextRequest, name: string, extra?: string[]): string {
  const ip = getClientIp(request);
  const parts = ['rl', name, ip, ...(extra || [])];
  return parts.join(':');
}
