/**
 * 数据库类型定义
 */

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  USER = 'user',
}

// 用户表结构
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  nickname?: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// 应用程序表结构
export interface Application {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  description?: string;
  redirectUris: string;  // JSON数组
  scopes: string;        // JSON数组
  userId: string;        // 创建者ID
  createdAt: string;
  updatedAt: string;
}

// 授权码表结构
export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: string;
  createdAt: string;
}

// 访问令牌表结构
export interface AccessToken {
  id: string;
  token: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: string;
  createdAt: string;
}

// 刷新令牌表结构
export interface RefreshToken {
  id: string;
  token: string;
  accessTokenId: string;
  expiresAt: string;
  createdAt: string;
}

// 用户会话表结构
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

// 用户授权记录
export interface UserConsent {
  id: string;
  userId: string;
  clientId: string;
  scope: string;
  createdAt: string;
}
