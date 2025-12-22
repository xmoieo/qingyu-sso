# SSO统一身份认证平台

一个兼容 OAuth 2.0 和 OpenID Connect (OIDC) 协议的企业级单点登录解决方案。

## 功能特性

- ✅ 用户注册和登录
- ✅ OAuth 2.0 Authorization Code Flow
- ✅ OpenID Connect (OIDC) 支持
- ✅ PKCE 支持（适用于SPA/移动端）
- ✅ 多角色权限管理（管理员/开发者/普通用户）
- ✅ 应用程序接入管理
- ✅ 响应式设计（桌面端/移动端适配）
- ✅ 多数据库支持（SQLite/MySQL/PostgreSQL）

## 技术栈

- **框架**: Next.js 16
- **UI**: Material UI (MUI)
- **运行时**: Bun
- **数据库**: SQLite3（可切换到MySQL/PostgreSQL）
- **认证**: JWT + Session

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

### 3. 启动开发服务器

```bash
bun run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 4. 第一个用户

注册的第一个用户将自动成为管理员。

## 用户角色

| 角色 | 权限 |
|------|------|
| 管理员 | 管理所有用户、创建开发者/管理员、管理所有应用 |
| 开发者 | 创建和管理自己的应用、授权登录 |
| 普通用户 | 维护个人信息、授权登录 |

## 路由结构

| 路由 | 说明 |
|------|------|
| `/login` | 登录页面 |
| `/register` | 注册页面 |
| `/dashboard` | 仪表盘 |
| `/user` | 个人信息管理 |
| `/users` | 用户管理（管理员） |
| `/applications` | 应用管理（管理员/开发者） |
| `/oauth/authorize` | OAuth授权同意页面 |

## OAuth 2.0 端点

| 端点 | 说明 |
|------|------|
| `GET /api/oauth/authorize` | 授权端点 |
| `POST /api/oauth/token` | 令牌端点 |
| `GET /api/oauth/userinfo` | 用户信息端点 |
| `POST /api/oauth/revoke` | 令牌撤销端点 |
| `GET /.well-known/openid-configuration` | OIDC发现端点 |

## 文档

- [API文档](./docs/API.md)
- [应用接入指南](./docs/INTEGRATION.md)

## 数据库配置

在 `.env` 文件中配置数据库类型：

```env
# SQLite（默认）
DB_TYPE=sqlite
SQLITE_PATH=./data/sso.db

# MySQL/MariaDB
# DB_TYPE=mysql
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASSWORD=
# MYSQL_DATABASE=sso

# PostgreSQL
# DB_TYPE=postgresql
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=
# POSTGRES_DATABASE=sso
```

## 生产部署

1. 修改 `JWT_SECRET` 为安全的随机字符串
2. 配置 `NEXT_PUBLIC_APP_URL` 为实际域名
3. 使用HTTPS
4. 考虑使用MySQL或PostgreSQL

```bash
bun run build
bun run start
```

## 许可证

MIT
