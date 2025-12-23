# SSO 统一身份认证平台

一个兼容 OAuth 2.0 和 OpenID Connect (OIDC) 协议的企业级单点登录解决方案。

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

## 功能特性

- ✅ 用户注册和登录
- ✅ OAuth 2.0 Authorization Code Flow
- ✅ OpenID Connect (OIDC) 支持
- ✅ PKCE 支持（适用于 SPA/移动端）
- ✅ 多角色权限管理（管理员/开发者/普通用户）
- ✅ 应用程序接入管理
- ✅ 响应式设计（桌面端/移动端适配）
- ✅ 多数据库支持（SQLite/MySQL/PostgreSQL）
- ✅ JWT 令牌管理
- ✅ 安全密码存储（bcrypt 加密）

## 技术栈

- **框架**: Next.js 16
- **UI**: Material UI (MUI)
- **运行时**: Node.js / Bun
- **数据库**: Prisma（SQLite/PostgreSQL/MySQL/MariaDB）
- **认证**: JWT + Session

## 快速开始

### 系统要求

- Node.js 18.0.0 或更高版本
- npm、yarn 或 bun 包管理器

### 1. 克隆项目

```bash
git clone https://github.com/your-username/sso.git
cd sso
```

### 2. 安装依赖

推荐使用 bun（速度更快）：

```bash
bun install
```

或者使用 npm：

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件并配置以下环境变量：

```env
# 数据库配置
DATABASE_URL="file:./data/sso.db"

# JWT密钥（生产环境请使用强随机字符串）
JWT_SECRET="please-change-me-in-production"

# 应用URL（生产环境需要修改）
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

说明：当前仓库提供 3 份 Prisma schema 文件：

- SQLite（默认）：`prisma/schema.prisma`
- PostgreSQL：`prisma/schema.postgresql.prisma`
- MySQL/MariaDB：`prisma/schema.mysql.prisma`

### 4. 初始化数据库

首次启动前需要初始化数据库表结构（以 SQLite 为例）：

```bash
bun run prisma:generate:sqlite
bun run prisma:dbpush:sqlite
```

或者使用 npm：

```bash
npm run prisma:generate:sqlite
npm run prisma:dbpush:sqlite
```

### 5. 启动开发服务器

```bash
bun run dev
```

或使用 npm：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 6. 创建管理员账户

注册的第一个用户将自动成为管理员。

## 用户角色

| 角色     | 权限                                          |
| -------- | --------------------------------------------- |
| 管理员   | 管理所有用户、创建开发者/管理员、管理所有应用 |
| 开发者   | 创建和管理自己的应用、授权登录                |
| 普通用户 | 维护个人信息、授权登录                        |

## 路由结构

| 路由               | 说明                      |
| ------------------ | ------------------------- |
| `/login`           | 登录页面                  |
| `/register`        | 注册页面                  |
| `/dashboard`       | 仪表盘                    |
| `/user`            | 个人信息管理              |
| `/users`           | 用户管理（管理员）        |
| `/applications`    | 应用管理（管理员/开发者） |
| `/oauth/authorize` | OAuth 授权同意页面        |

## OAuth 2.0 端点

| 端点                                    | 说明          |
| --------------------------------------- | ------------- |
| `GET /api/oauth/authorize`              | 授权端点      |
| `POST /api/oauth/token`                 | 令牌端点      |
| `GET /api/oauth/userinfo`               | 用户信息端点  |
| `POST /api/oauth/revoke`                | 令牌撤销端点  |
| `GET /.well-known/openid-configuration` | OIDC 发现端点 |

## 文档

- [API 文档](./docs/API.md)
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

## 项目结构

```
sso/
├── app/              # Next.js App Router页面和API路由
├── components/       # React组件
├── lib/             # 工具函数和共享代码
├── prisma/          # 数据库模型和迁移
├── public/          # 静态资源
├── docs/            # 项目文档
└── data/            # SQLite数据库文件
```

## 开发指南

### 添加新的数据库支持

1. 在 `prisma/` 目录下创建新的 schema 文件
2. 在 `package.json` 中添加相应的生成和推送命令
3. 更新 `lib/db.ts` 中的数据库连接逻辑

### 添加新的 OAuth Scope

1. 更新 `lib/oauth/scopes.ts` 定义新的权限范围
2. 在用户信息端点处理新 Scope 对应的用户数据
3. 更新 API 文档

## 生产部署

### 环境要求

- Node.js 18.0.0 或更高版本
- 生产级数据库（推荐 PostgreSQL 或 MySQL）
- HTTPS 证书

### 部署步骤

1. 设置安全的环境变量：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sso"
JWT_SECRET="your-super-secret-jwt-key"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

2. 构建应用：

```bash
bun run build
```

3. 启动生产服务器：

```bash
bun run start
```

### Docker 部署（可选）

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN bun install --frozen-lockfile --production

COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", "start"]
```

创建 `docker-compose.yml`：

```yaml
version: "3.8"
services:
  sso:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/sso
      - JWT_SECRET=your-super-secret-jwt-key
      - NEXT_PUBLIC_APP_URL=https://your-domain.com
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=sso
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 故障排除

### 常见问题

1. **数据库连接失败**

   - 检查 `DATABASE_URL` 配置是否正确
   - 确认数据库服务已启动
   - 验证网络连接和防火墙设置

2. **JWT 令牌验证失败**

   - 确认 `JWT_SECRET` 在所有环境中一致
   - 检查令牌是否已过期

3. **OAuth 授权失败**
   - 验证应用的 `redirect_uri` 配置
   - 检查客户端 ID 和密钥是否正确
   - 确认授权范围是否匹配

## 贡献指南

欢迎提交问题报告和拉取请求！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开拉取请求
