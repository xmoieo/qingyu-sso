# 应用程序接入指南

本文档介绍如何将您的应用程序接入SSO统一身份认证平台。

## 快速开始

### 1. 创建应用

1. 使用管理员或开发者账户登录SSO平台
2. 进入"应用管理"页面
3. 点击"创建应用"按钮
4. 填写应用信息：
   - **应用名称**: 您的应用名称，将显示在授权页面
   - **应用描述**: 可选，描述您的应用功能
   - **重定向URI**: 授权完成后的回调地址（每行一个）
   - **授权范围**: 您需要的权限（openid, profile, email, offline_access）

5. 创建成功后，您将获得：
   - **Client ID**: 应用唯一标识
   - **Client Secret**: 应用密钥（请妥善保管）

### 2. 集成OAuth 2.0

#### 方式一：Authorization Code Flow（推荐）

适用于有后端服务的Web应用。

**步骤1: 重定向用户到授权页面**

```javascript
const authUrl = new URL('http://sso.example.com/api/oauth/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'your_client_id');
authUrl.searchParams.set('redirect_uri', 'http://your-app.com/callback');
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('state', generateRandomState()); // 保存到session

window.location.href = authUrl.toString();
```

**步骤2: 处理回调**

用户授权后，SSO平台会重定向到您的回调地址：
```
http://your-app.com/callback?code=xxx&state=xxx
```

**步骤3: 用授权码换取令牌**

```javascript
const response = await fetch('http://sso.example.com/api/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'http://your-app.com/callback',
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
  }),
});

const tokens = await response.json();
// tokens.access_token - 访问令牌
// tokens.id_token - OIDC ID令牌（包含用户信息）
// tokens.refresh_token - 刷新令牌（如果请求了offline_access）
```

**步骤4: 获取用户信息**

```javascript
const userResponse = await fetch('http://sso.example.com/api/oauth/userinfo', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`,
  },
});

const userInfo = await userResponse.json();
// userInfo.sub - 用户唯一ID
// userInfo.name - 用户名/昵称
// userInfo.email - 邮箱
```

#### 方式二：使用PKCE（单页应用/移动端推荐）

PKCE (Proof Key for Code Exchange) 适用于无法安全存储Client Secret的客户端。

**步骤1: 生成PKCE参数**

```javascript
// 生成code_verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// 生成code_challenge
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);
// 保存codeVerifier到sessionStorage
sessionStorage.setItem('code_verifier', codeVerifier);
```

**步骤2: 授权请求带上PKCE参数**

```javascript
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
```

**步骤3: 换取令牌时带上code_verifier**

```javascript
body: new URLSearchParams({
  grant_type: 'authorization_code',
  code: authorizationCode,
  redirect_uri: 'http://your-app.com/callback',
  client_id: 'your_client_id',
  code_verifier: sessionStorage.getItem('code_verifier'),
}),
```

---

## 示例代码

### Node.js (Express)

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

const SSO_URL = 'http://sso.example.com';
const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const REDIRECT_URI = 'http://localhost:8080/callback';

// 登录入口
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const authUrl = new URL(`${SSO_URL}/api/oauth/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
});

// 回调处理
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // 验证state
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state');
  }

  // 换取令牌
  const tokenResponse = await fetch(`${SSO_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return res.status(400).json(tokens);
  }

  // 获取用户信息
  const userResponse = await fetch(`${SSO_URL}/api/oauth/userinfo`, {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  });

  const user = await userResponse.json();

  // 创建本地会话
  req.session.user = user;
  res.redirect('/dashboard');
});

app.listen(8080);
```

### Python (Flask)

```python
from flask import Flask, redirect, request, session, url_for
import requests
import secrets

app = Flask(__name__)
app.secret_key = 'your-secret-key'

SSO_URL = 'http://sso.example.com'
CLIENT_ID = 'your_client_id'
CLIENT_SECRET = 'your_client_secret'
REDIRECT_URI = 'http://localhost:5000/callback'

@app.route('/login')
def login():
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state
    
    auth_url = (
        f"{SSO_URL}/api/oauth/authorize?"
        f"response_type=code&"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"scope=openid profile email&"
        f"state={state}"
    )
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    if state != session.get('oauth_state'):
        return 'Invalid state', 400
    
    # 换取令牌
    token_response = requests.post(
        f"{SSO_URL}/api/oauth/token",
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
        }
    )
    tokens = token_response.json()
    
    # 获取用户信息
    user_response = requests.get(
        f"{SSO_URL}/api/oauth/userinfo",
        headers={'Authorization': f"Bearer {tokens['access_token']}"}
    )
    user = user_response.json()
    
    session['user'] = user
    return redirect('/dashboard')

if __name__ == '__main__':
    app.run(port=5000)
```

---

## 刷新令牌

当访问令牌过期后，使用刷新令牌获取新的访问令牌：

```javascript
const response = await fetch('http://sso.example.com/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: storedRefreshToken,
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
  }),
});

const newTokens = await response.json();
```

---

## 登出

撤销令牌实现登出：

```javascript
await fetch('http://sso.example.com/api/oauth/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    token: accessToken,
  }),
});
```

---

## 常见问题

### Q: redirect_uri不匹配怎么办？

确保授权请求中的redirect_uri与应用配置中的完全一致，包括协议、端口号和路径。

### Q: 如何处理令牌过期？

1. 检测401响应
2. 使用refresh_token获取新的access_token
3. 重试原请求

### Q: 是否支持单点登出？

目前暂不支持单点登出，需要在各个应用分别清除会话。

### Q: 如何验证ID Token？

ID Token使用HS256签名，需要使用Client Secret进行验证。

---

## 技术支持

如有问题，请联系系统管理员。
