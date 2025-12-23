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
- **运行时**: Node.js / Bun
- **数据库**: Prisma（SQLite/PostgreSQL/MySQL/MariaDB）
- **认证**: JWT + Session

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

至少需要配置数据库连接（Prisma 使用 `DATABASE_URL`）。默认使用 SQLite：

```env
DATABASE_URL="file:./data/sso.db"
JWT_SECRET="please-change-me"
```

说明：当前仓库提供 3 份 Prisma schema 文件：

- SQLite（默认）：`prisma/schema.prisma`
- PostgreSQL：`prisma/schema.postgresql.prisma`
- MySQL/MariaDB：`prisma/schema.mysql.prisma`

### 3. 启动开发服务器

```bash
bun run dev
```

首次启动前需要初始化数据库表结构（以 SQLite 为例）：

```bash
npm run prisma:generate:sqlite
npm run prisma:dbpush:sqlite
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

在 `.env` 文件中配置 Prisma 连接字符串：

```env
DATABASE_URL="file:./data/sso.db"
```

### 切换数据库（PostgreSQL / MySQL / MariaDB）

Prisma Client 是根据 schema 生成的：切换数据库时，需要选择匹配的 schema 重新生成 client，并推送表结构。

- **PostgreSQL**
	- `DATABASE_URL="postgresql://user:password@localhost:5432/sso"`
	- `npm run prisma:generate:postgresql`
	- `npm run prisma:dbpush:postgresql`

- **MySQL / MariaDB**（Prisma schema 的 provider 都是 `mysql`）
	- `DATABASE_URL="mysql://user:password@localhost:3306/sso"`
	- `npm run prisma:generate:mysql`
	- `npm run prisma:dbpush:mysql`

兼容说明：运行时如果未设置 `DATABASE_URL`，服务端会尝试读取 `DB_TYPE` 以及 `SQLITE_PATH` / `POSTGRES_*` / `MYSQL_*` 来拼接连接串；但 Prisma CLI（`prisma generate/db push`）仍建议显式设置 `DATABASE_URL`。

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
