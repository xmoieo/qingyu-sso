# 项目架构文档

## 系统概述

SSO 统一身份认证平台采用现代化的技术栈，实现了一个兼容 OAuth 2.0 和 OpenID Connect 协议的企业级单点登录解决方案。

## 技术栈

- **前端框架**: Next.js 16 (App Router)
- **UI 库**: Material UI (MUI) + Joy UI
- **运行时**: Node.js / Bun
- **数据库**: Prisma ORM（支持 SQLite/MySQL/PostgreSQL）
- **认证**: JWT + Session
- **语言**: TypeScript

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    客户端应用                        │
├─────────────────────────────────────────────────────┤
│                  SSO认证平台                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │   前端页面     │  │   API路由     │  │  OAuth服务 │ │
│  │               │  │               │  │           │ │
│  │  - 登录/注册   │  │  - 用户认证    │  │  - 授权端点│ │
│  │  - 用户管理    │  │  - 应用管理    │  │  - 令牌端点│ │
│  │  - 应用管理    │  │  - 系统配置    │  │  - 用户信息│ │
│  └───────────────┘  └───────────────┘  └───────────┘ │
├─────────────────────────────────────────────────────┤
│                  数据层                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │   Prisma ORM  │  │   数据库      │  │  文件存储  │ │
│  │               │  │               │  │           │ │
│  │  - 模型定义    │  │  - SQLite     │  │  - 头像    │ │
│  │  - 查询构建    │  │  - MySQL      │  │  - 日志    │ │
│  │  - 数据验证    │  │  - PostgreSQL │  │           │ │
│  └───────────────┘  └───────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
```

### 目录结构

```
sso/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关页面组
│   │   ├── login/         # 登录页面
│   │   └── register/      # 注册页面
│   ├── dashboard/         # 仪表盘
│   ├── oauth/             # OAuth页面
│   │   └── authorize/     # 授权同意页面
│   ├── api/               # API路由
│   │   ├── auth/          # 认证API
│   │   ├── oauth/         # OAuth API
│   │   ├── users/         # 用户管理API
│   │   └── applications/  # 应用管理API
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # React组件
│   ├── ui/               # 基础UI组件
│   ├── forms/            # 表单组件
│   ├── layout/           # 布局组件
│   └── auth/             # 认证相关组件
├── lib/                  # 工具库
│   ├── auth.ts           # 认证逻辑
│   ├── db.ts             # 数据库连接
│   ├── oauth.ts          # OAuth服务
│   ├── utils.ts          # 通用工具函数
│   └── validations.ts    # 数据验证
├── prisma/               # 数据库
│   ├── schema.prisma     # SQLite schema
│   ├── schema.postgresql.prisma  # PostgreSQL schema
│   └── schema.mysql.prisma       # MySQL schema
├── public/               # 静态资源
└── data/                 # SQLite数据库文件
```

## 核心模块

### 认证模块 (lib/auth.ts)

负责用户认证和会话管理：

- JWT 令牌生成和验证
- 用户密码验证
- 会话管理
- 中间件认证检查

### OAuth 模块 (lib/oauth.ts)

实现 OAuth 2.0 和 OIDC 协议：

- 授权码流程处理
- 令牌生成和验证
- 用户信息端点
- PKCE 支持

### 数据库模块 (lib/db.ts)

数据库连接和操作：

- Prisma 客户端初始化
- 多数据库支持
- 连接池管理

## 数据模型

### 用户模型

```typescript
interface User {
  id: string; // UUID
  username: string; // 用户名（唯一）
  email: string; // 邮箱（唯一）
  password: string; // 加密密码
  nickname?: string; // 昵称
  role: UserRole; // 用户角色
  avatar?: string; // 头像URL
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}
```

### 应用模型

```typescript
interface Application {
  id: string; // UUID
  name: string; // 应用名称
  description?: string; // 应用描述
  clientId: string; // 客户端ID（唯一）
  clientSecret: string; // 客户端密钥
  redirectUris: string[]; // 重定向URI列表
  scopes: string[]; // 允许的权限范围
  userId: string; // 创建者ID
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}
```

### 授权模型

```typescript
interface Authorization {
  id: string; // UUID
  userId: string; // 用户ID
  applicationId: string; // 应用ID
  scopes: string[]; // 授权范围
  createdAt: Date; // 创建时间
}
```

## 安全设计

### 密码安全

- 使用 bcrypt 进行密码哈希，成本因子为 12
- 密码强度验证：至少 8 位，包含字母和数字
- 防密码暴力破解：登录失败后延迟响应

### 令牌安全

- JWT 使用 HS256 算法签名
- 访问令牌有效期 1 小时
- 刷新令牌有效期 30 天
- 支持令牌撤销

### 数据传输安全

- 所有 API 支持 HTTPS
- CORS 限制可信来源
- XSS 和 CSRF 防护
- 安全 Cookie 设置（HttpOnly, Secure, SameSite）

## 性能优化

### 数据库优化

- 适当的索引设计
- 查询优化，避免 N+1 问题
- 连接池管理

### 缓存策略

- JWT 自包含，减少数据库查询
- 用户信息缓存
- 应用配置缓存

### 前端优化

- 代码分割和懒加载
- 资源压缩和 CDN
- 响应式设计适配移动端

## 扩展性设计

### 水平扩展

- 无状态应用设计
- 外部会话存储
- 数据库读写分离

### 多租户支持

- 可扩展的数据模型
- 租户隔离机制

### 插件化架构

- 可插拔的认证提供者
- 自定义主题支持
- 扩展点设计

## 部署架构

### 开发环境

```
开发者机器
├── Node.js/Bun运行时
├── SQLite数据库
└── 开发服务器
```

### 生产环境

```
负载均衡器
    ↓
Web服务器 (Nginx)
    ↓
应用服务器集群
    ↓
数据库集群 (PostgreSQL)
```

## 监控和日志

### 应用监控

- 性能指标监控
- 错误率监控
- 用户行为分析

### 安全监控

- 登录审计日志
- 异常访问检测
- 令牌使用监控

### 日志管理

- 结构化日志
- 日志级别管理
- 日志聚合和分析

## 未来规划

### 功能扩展

- 多因素认证 (MFA)
- 社交登录集成
- 单点登出 (SLO)
- 动态客户端注册

### 技术升级

- GraphQL API 支持
- 微服务架构演进
- 容器化部署
- 云原生集成
