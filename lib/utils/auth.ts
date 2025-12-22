/**
 * 认证中间件工具
 */
import { cookies } from 'next/headers';
import { authService, userService } from '../services';
import { User, UserRole } from '../db';

export interface AuthContext {
  user: User;
  sessionId: string;
}

// 从请求中获取认证信息
export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return null;
  }

  // 验证会话是否有效
  const session = await authService.validateSession(payload.sessionId);
  if (!session) {
    return null;
  }

  // 获取用户信息
  const user = await userService.findById(payload.userId);
  if (!user) {
    return null;
  }

  return { user, sessionId: payload.sessionId };
}

// 检查用户是否有指定角色
export function hasRole(user: User, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

// 检查是否是管理员
export function isAdmin(user: User): boolean {
  return user.role === UserRole.ADMIN;
}

// 检查是否是开发者或管理员
export function isDeveloperOrAdmin(user: User): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.DEVELOPER;
}
