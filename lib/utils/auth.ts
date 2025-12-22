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

/**
 * 密码复杂度配置
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

// 默认密码策略
const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * 验证密码复杂度
 * @param password 待验证的密码
 * @param policy 密码策略（可选，使用默认策略）
 * @returns 如果验证失败返回错误消息，成功返回 null
 */
export function validatePasswordComplexity(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): string | null {
  if (!password) {
    return '密码不能为空';
  }

  if (password.length < policy.minLength) {
    return `密码长度不能少于${policy.minLength}位`;
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return '密码必须包含至少一个大写字母';
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return '密码必须包含至少一个小写字母';
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    return '密码必须包含至少一个数字';
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    return '密码必须包含至少一个特殊字符（如 !@#$%^&*）';
  }

  // 检查常见弱密码模式
  const weakPatterns = [
    /^(.)\1+$/,           // 全部相同字符
    /^(012|123|234|345|456|567|678|789|890)+$/,  // 连续数字
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i,  // 连续字母
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return '密码过于简单，请使用更复杂的密码';
    }
  }

  return null;
}
