/**
 * 头像工具函数
 * 支持 Gravatar 和 Cravatar
 */
import crypto from 'crypto';
import { settingsService } from './services/settings';

// 获取邮箱的 MD5 哈希
function getEmailHash(email: string): string {
  return crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

// 获取 Gravatar URL
export function getGravatarUrl(email: string, size = 80): string {
  const hash = getEmailHash(email);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

// 获取 Cravatar URL
export function getCravatarUrl(email: string, size = 80): string {
  const hash = getEmailHash(email);
  return `https://cravatar.cn/avatar/${hash}?s=${size}&d=identicon`;
}

// 根据系统设置获取头像 URL
export function getAvatarUrl(email: string, size = 80): string {
  const provider = settingsService.get('avatar_provider') || 'gravatar';
  
  if (provider === 'cravatar') {
    return getCravatarUrl(email, size);
  }
  
  return getGravatarUrl(email, size);
}

// 服务器端获取用户头像（可用于API响应）
export function getUserAvatarUrl(user: { email: string; avatar?: string }, size = 80): string {
  // 如果用户设置了自定义头像，直接使用
  if (user.avatar) {
    return user.avatar;
  }
  
  return getAvatarUrl(user.email, size);
}
