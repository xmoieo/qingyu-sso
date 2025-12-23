# 更新日志

所有重要的更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 计划中

- 多因素认证 (MFA)
- 社交登录集成
- 单点登出 (SLO)
- 动态客户端注册
- GraphQL API 支持

## [1.0.0] - 2024-12-23

### 新增

- 用户注册和登录功能
- OAuth 2.0 Authorization Code Flow
- OpenID Connect (OIDC) 支持
- PKCE 支持（适用于 SPA/移动端）
- 多角色权限管理（管理员/开发者/普通用户）
- 应用程序接入管理
- 响应式设计（桌面端/移动端适配）
- 多数据库支持（SQLite/MySQL/PostgreSQL）
- JWT 令牌管理
- 安全密码存储（bcrypt 加密）

### 技术栈

- Next.js 16 (App Router)
- Material UI (MUI) + Joy UI
- Prisma ORM
- TypeScript
- Node.js / Bun 运行时

### API 端点

- `GET/POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息
- `GET/POST /api/oauth/authorize` - OAuth 授权端点
- `POST /api/oauth/token` - 令牌端点
- `GET /api/oauth/userinfo` - 用户信息端点
- `POST /api/oauth/revoke` - 令牌撤销端点
- `GET /.well-known/openid-configuration` - OIDC 发现端点

### 数据库模型

- 用户模型 (User)
- 应用模型 (Application)
- 授权模型 (Authorization)
- 令牌模型 (Token)
- 会话模型 (Session)

### 安全特性

- 密码哈希 (bcrypt)
- JWT 令牌签名和验证
- XSS 和 CSRF 防护
- 安全 Cookie 设置
- CORS 保护

### 文档

- README.md - 项目概述和快速开始
- API.md - API 文档
- INTEGRATION.md - 应用接入指南
- ARCHITECTURE.md - 系统架构文档
- DEVELOPMENT.md - 开发指南
- CHANGELOG.md - 更新日志

---

## 版本说明

### 版本号格式

本项目使用语义化版本 (SemVer)：`主版本号.次版本号.修订号`

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 更新类型

- `新增` - 新功能
- `更改` - 对现有功能的更改
- `弃用` - 即将删除的功能
- `移除` - 已删除的功能
- `修复` - 问题修复
- `安全` - 安全相关的修复

### 发布周期

- **主版本**：根据需要发布，通常包含重大架构更改
- **次版本**：每月发布，包含新功能和改进
- **修订版本**：根据需要发布，主要用于 bug 修复

---

## 贡献指南

如果您想为此项目做出贡献，请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 如何提交更改

1. Fork 此仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开拉取请求

---

## 反馈与支持

如果您有任何问题或建议，请通过以下方式联系我们：

- 提交 [Issue](https://github.com/your-username/sso/issues)
- 发送邮件至 your-email@example.com
- 参与 [讨论区](https://github.com/your-username/sso/discussions)

感谢您使用 SSO 统一身份认证平台！
