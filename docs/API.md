# SSO 统一身份认证平台 - API 文档

## 概述

本平台是一个兼容 OAuth 2.0 和 OpenID Connect (OIDC) 协议的统一身份认证系统。

**基础 URL**: `http://localhost:3000`（根据实际部署地址调整）

**版本**: v1.0.0

**认证方式**: OAuth 2.0 Bearer Token

**数据格式**: JSON

## OIDC 发现端点

### 获取 OpenID 配置

```
GET /.well-known/openid-configuration
```

返回 OIDC 配置信息，包括所有端点地址和支持的特性。

**响应示例**:

```json
{
  "issuer": "http://localhost:3000",
  "authorization_endpoint": "http://localhost:3000/api/oauth/authorize",
  "token_endpoint": "http://localhost:3000/api/oauth/token",
  "userinfo_endpoint": "http://localhost:3000/api/oauth/userinfo",
  "revocation_endpoint": "http://localhost:3000/api/oauth/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "code_challenge_methods_supported": ["plain", "S256"]
}
```

---

## OAuth 2.0 / OIDC 端点

### 1. 授权端点

```
GET /api/oauth/authorize
```

启动授权码流程，将用户重定向到登录/授权页面。

**请求参数**:

| 参数                    | 必填 | 说明                                    |
| ----------------------- | ---- | --------------------------------------- |
| `response_type`         | 是   | 必须为 `code`                           |
| `client_id`             | 是   | 应用的 Client ID                        |
| `redirect_uri`          | 是   | 授权后的回调地址，必须与应用配置匹配    |
| `scope`                 | 否   | 请求的权限范围，空格分隔，默认 `openid` |
| `state`                 | 推荐 | 防 CSRF 的随机字符串，会原样返回        |
| `nonce`                 | 否   | OIDC 用于 ID Token 的随机字符串         |
| `code_challenge`        | 否   | PKCE code challenge                     |
| `code_challenge_method` | 否   | PKCE 方法: `plain` 或 `S256`            |

**成功响应**: 重定向到 `redirect_uri`，带上授权码

```
{redirect_uri}?code={authorization_code}&state={state}
```

**错误响应**:

```
{redirect_uri}?error={error_code}&error_description={description}&state={state}
```

---

### 2. 令牌端点

```
POST /api/oauth/token
```

用授权码交换访问令牌。

**Content-Type**: `application/x-www-form-urlencoded` 或 `application/json`

**授权码换令牌请求参数**:

| 参数            | 必填 | 说明                                   |
| --------------- | ---- | -------------------------------------- |
| `grant_type`    | 是   | `authorization_code`                   |
| `code`          | 是   | 授权码                                 |
| `redirect_uri`  | 是   | 与授权请求相同的回调地址               |
| `client_id`     | 是   | 应用的 Client ID                       |
| `client_secret` | 否   | 应用的 Client Secret（机密客户端必填） |
| `code_verifier` | 否   | PKCE code verifier                     |

**刷新令牌请求参数**:

| 参数            | 必填 | 说明                 |
| --------------- | ---- | -------------------- |
| `grant_type`    | 是   | `refresh_token`      |
| `refresh_token` | 是   | 刷新令牌             |
| `client_id`     | 是   | 应用的 Client ID     |
| `client_secret` | 否   | 应用的 Client Secret |

**成功响应**:

```json
{
  "access_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "xyz789...",
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**错误响应**:

```json
{
  "error": "invalid_grant",
  "error_description": "Invalid authorization code"
}
```

---

### 3. 用户信息端点

```
GET /api/oauth/userinfo
```

获取当前用户信息。

**请求头**:

```
Authorization: Bearer {access_token}
```

**成功响应**:

```json
{
  "sub": "user-uuid",
  "name": "张三",
  "preferred_username": "zhangsan",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

---

### 4. 令牌撤销端点

```
POST /api/oauth/revoke
```

撤销访问令牌或刷新令牌。

**请求参数**:

| 参数              | 必填 | 说明                              |
| ----------------- | ---- | --------------------------------- |
| `token`           | 是   | 要撤销的令牌                      |
| `token_type_hint` | 否   | `access_token` 或 `refresh_token` |

**响应**: HTTP 200（无论令牌是否存在都返回 200）

---

## 内部 API

### 用户认证

#### 注册

```
POST /api/auth/register
```

**请求体**:

```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "123456",
  "nickname": "张三"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "nickname": "张三",
    "role": "user"
  },
  "message": "注册成功"
}
```

#### 登录

```
POST /api/auth/login
```

**请求体**:

```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

**响应**: 设置 `auth_token` Cookie 并返回用户信息

#### 登出

```
POST /api/auth/logout
```

**响应**: 清除 Cookie

#### 获取当前用户

```
GET /api/auth/me
```

**响应**: 当前登录用户信息

---

## Scopes 说明

| Scope            | 说明                            |
| ---------------- | ------------------------------- |
| `openid`         | 返回 ID Token，包含用户唯一标识 |
| `profile`        | 返回用户名和昵称                |
| `email`          | 返回邮箱地址                    |
| `offline_access` | 返回刷新令牌                    |

---

## 错误码

| 错误码                      | 说明             |
| --------------------------- | ---------------- |
| `invalid_request`           | 请求参数错误     |
| `invalid_client`            | 客户端认证失败   |
| `invalid_grant`             | 授权码或令牌无效 |
| `unsupported_grant_type`    | 不支持的授权类型 |
| `unsupported_response_type` | 不支持的响应类型 |
| `invalid_scope`             | 无效的 scope     |
| `access_denied`             | 用户拒绝授权     |
| `server_error`              | 服务器错误       |

---

## 令牌管理

### 令牌类型

| 令牌类型                 | 用途             | 有效期     |
| ------------------------ | ---------------- | ---------- |
| 访问令牌 (Access Token)  | 访问受保护资源   | 1 小时     |
| 刷新令牌 (Refresh Token) | 获取新的访问令牌 | 30 天      |
| ID 令牌 (ID Token)       | 包含用户身份信息 | 验证时有效 |

### 令牌存储建议

- **访问令牌**: 内存存储，随应用关闭而清除
- **刷新令牌**: 持久化存储（如 secure cookie 或 encrypted storage）
- **ID 令牌**: 短期存储，用于用户身份验证

## 安全建议

1. **使用 HTTPS**: 生产环境必须使用 HTTPS，防止令牌被窃听
2. **使用 PKCE**: 推荐所有客户端（特别是 SPA 和移动应用）使用 PKCE
3. **验证 State**: 防止 CSRF 攻击，始终验证 state 参数
4. **安全存储**: 客户端密钥应安全存储，不要提交到代码仓库
5. **令牌有效期**: 访问令牌 1 小时，刷新令牌 30 天
6. **定期轮换密钥**: 定期更换 JWT_SECRET 和应用密钥
7. **令牌撤销**: 用户登出时应撤销令牌

## 限流策略

API 实现了请求限流，防止滥用：

| 端点类型 | 限制                  |
| -------- | --------------------- |
| 认证端点 | 每分钟最多 10 次请求  |
| 令牌端点 | 每分钟最多 20 次请求  |
| 其他 API | 每分钟最多 100 次请求 |

超出限制将返回 HTTP 429 状态码。

## 响应格式

所有 API 响应遵循统一格式：

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

## 测试工具

### Postman 集合

提供了完整的 Postman 集合，可在 [这里下载](./postman_collection.json)。

### 在线测试

可使用以下工具测试 OAuth 流程：

- [OAuth 2.0 Playground](https://oauth2-cli.debugger.okta.com/)
- [OAuth 2.0 Client](https://www.oauth.com/playground/)

## SDK 支持

目前提供以下语言/平台的 SDK：

- [JavaScript/TypeScript SDK](./sdks/js/)
- [Python SDK](./sdks/python/)
- [Java SDK](./sdks/java/)

如需其他语言的 SDK，请提交 Issue。
