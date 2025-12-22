/**
 * 共享类型定义
 * 此文件可以在客户端和服务端安全使用
 */

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  USER = 'user',
}

// 用户信息（不含敏感字段）
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// 应用信息（不含敏感字段）
export interface ApplicationInfo {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  createdAt: string;
}
