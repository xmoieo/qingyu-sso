/**
 * OAuth2.0服务层
 */
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { JWTPayload } from 'jose';
import { getDatabase } from '../db';
import { signJWT } from '../keys';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 授权码有效期（10分钟）
const AUTH_CODE_EXPIRES_IN = 10 * 60 * 1000;
// 访问令牌有效期（1小时）
const ACCESS_TOKEN_EXPIRES_IN = 60 * 60 * 1000;
// 刷新令牌有效期（30天）
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000;

interface CreateAuthCodeParams {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

interface TokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

interface UserInfo {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
}

export const oauthService = {
  // 创建授权码
  async createAuthorizationCode(params: CreateAuthCodeParams): Promise<string> {
    const db = getDatabase();
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRES_IN).toISOString();

    const stmt = db.prepare(`
      INSERT INTO authorization_codes (code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      code,
      params.clientId,
      params.userId,
      params.redirectUri,
      params.scope,
      params.codeChallenge || null,
      params.codeChallengeMethod || null,
      expiresAt
    );

    return code;
  },

  // 验证授权码
  async validateAuthorizationCode(code: string): Promise<{
    clientId: string;
    userId: string;
    redirectUri: string;
    scope: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  } | null> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM authorization_codes 
      WHERE code = ? AND expires_at > datetime('now')
    `);
    const row = stmt.get(code) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    // 删除已使用的授权码（一次性使用）
    const deleteStmt = db.prepare('DELETE FROM authorization_codes WHERE code = ?');
    deleteStmt.run(code);

    return {
      clientId: row.client_id as string,
      userId: row.user_id as string,
      redirectUri: row.redirect_uri as string,
      scope: row.scope as string,
      codeChallenge: row.code_challenge as string | undefined,
      codeChallengeMethod: row.code_challenge_method as string | undefined,
    };
  },

  // 验证PKCE code_verifier
  verifyCodeChallenge(verifier: string, challenge: string, method: string): boolean {
    if (method === 'plain') {
      return verifier === challenge;
    } else if (method === 'S256') {
      const hash = crypto.createHash('sha256').update(verifier).digest();
      const computed = Buffer.from(hash).toString('base64url');
      return computed === challenge;
    }
    return false;
  },

  // 创建访问令牌
  async createAccessToken(clientId: string, userId: string, scope: string): Promise<{
    accessToken: string;
    accessTokenId: string;
    expiresAt: Date;
  }> {
    const db = getDatabase();
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN);

    const stmt = db.prepare(`
      INSERT INTO access_tokens (id, token, client_id, user_id, scope, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, token, clientId, userId, scope, expiresAt.toISOString());

    return { accessToken: token, accessTokenId: id, expiresAt };
  },

  // 创建刷新令牌
  async createRefreshToken(accessTokenId: string): Promise<string> {
    const db = getDatabase();
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN).toISOString();

    const stmt = db.prepare(`
      INSERT INTO refresh_tokens (id, token, access_token_id, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, token, accessTokenId, expiresAt);

    return token;
  },

  // 验证访问令牌
  async validateAccessToken(token: string): Promise<{
    userId: string;
    clientId: string;
    scope: string;
  } | null> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM access_tokens 
      WHERE token = ? AND expires_at > datetime('now')
    `);
    const row = stmt.get(token) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      userId: row.user_id as string,
      clientId: row.client_id as string,
      scope: row.scope as string,
    };
  },

  // 验证刷新令牌
  async validateRefreshToken(token: string): Promise<{
    accessTokenId: string;
    userId: string;
    clientId: string;
    scope: string;
  } | null> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT rt.*, at.user_id, at.client_id, at.scope
      FROM refresh_tokens rt
      JOIN access_tokens at ON rt.access_token_id = at.id
      WHERE rt.token = ? AND rt.expires_at > datetime('now')
    `);
    const row = stmt.get(token) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      accessTokenId: row.access_token_id as string,
      userId: row.user_id as string,
      clientId: row.client_id as string,
      scope: row.scope as string,
    };
  },

  // 撤销令牌
  async revokeToken(token: string): Promise<boolean> {
    const db = getDatabase();

    // 尝试作为访问令牌删除
    let stmt = db.prepare('DELETE FROM access_tokens WHERE token = ?');
    let result = stmt.run(token);

    if (result.changes > 0) {
      return true;
    }

    // 尝试作为刷新令牌删除
    stmt = db.prepare('DELETE FROM refresh_tokens WHERE token = ?');
    result = stmt.run(token);

    return result.changes > 0;
  },

  // 生成ID Token (OIDC) - 使用RS256算法
  async generateIdToken(userId: string, clientId: string, nonce?: string): Promise<string> {
    const db = getDatabase();
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = userStmt.get(userId) as Record<string, unknown> | undefined;

    if (!user) {
      throw new Error('用户不存在');
    }

    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
      iss: APP_URL,
      sub: userId,
      aud: clientId,
      exp: now + 3600, // 1小时后过期
      iat: now,
      auth_time: now,
    };

    if (nonce) {
      payload.nonce = nonce;
    }

    // 添加用户信息
    payload.name = (user.nickname || user.username) as string;
    payload.preferred_username = user.username as string;
    payload.email = user.email as string;
    payload.email_verified = true;

    // 使用RS256算法签名
    const jwt = await signJWT(payload);

    return jwt;
  },

  // 获取用户信息 (OIDC UserInfo)
  async getUserInfo(userId: string, scope: string): Promise<UserInfo> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(userId) as Record<string, unknown> | undefined;

    if (!user) {
      throw new Error('用户不存在');
    }

    const scopes = scope.split(' ');
    const userInfo: UserInfo = {
      sub: userId,
    };

    if (scopes.includes('profile')) {
      userInfo.name = (user.nickname || user.username) as string;
      userInfo.preferred_username = user.username as string;
    }

    if (scopes.includes('email')) {
      userInfo.email = user.email as string;
      userInfo.email_verified = true;
    }

    return userInfo;
  },

  // 交换令牌
  async exchangeToken(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier?: string,
    nonce?: string
  ): Promise<TokenResult | null> {
    // 验证授权码
    const authCode = await this.validateAuthorizationCode(code);

    if (!authCode) {
      return null;
    }

    // 验证客户端ID
    if (authCode.clientId !== clientId) {
      return null;
    }

    // 验证重定向URI
    if (authCode.redirectUri !== redirectUri) {
      return null;
    }

    // 验证PKCE
    if (authCode.codeChallenge && authCode.codeChallengeMethod) {
      if (!codeVerifier) {
        return null;
      }
      if (!this.verifyCodeChallenge(codeVerifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
        return null;
      }
    }

    // 创建访问令牌
    const { accessToken, accessTokenId, expiresAt } = await this.createAccessToken(
      clientId,
      authCode.userId,
      authCode.scope
    );

    const result: TokenResult = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      scope: authCode.scope,
    };

    // 如果scope包含offline_access，创建刷新令牌
    if (authCode.scope.includes('offline_access')) {
      result.refresh_token = await this.createRefreshToken(accessTokenId);
    }

    // 如果scope包含openid，生成ID Token
    if (authCode.scope.includes('openid')) {
      result.id_token = await this.generateIdToken(authCode.userId, clientId, nonce);
    }

    return result;
  },

  // 刷新令牌
  async refreshAccessToken(refreshToken: string): Promise<TokenResult | null> {
    const tokenData = await this.validateRefreshToken(refreshToken);

    if (!tokenData) {
      return null;
    }

    // 创建新的访问令牌
    const { accessToken, accessTokenId, expiresAt } = await this.createAccessToken(
      tokenData.clientId,
      tokenData.userId,
      tokenData.scope
    );

    const result: TokenResult = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      scope: tokenData.scope,
    };

    // 创建新的刷新令牌
    if (tokenData.scope.includes('offline_access')) {
      result.refresh_token = await this.createRefreshToken(accessTokenId);

      // 删除旧的刷新令牌
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM refresh_tokens WHERE token = ?');
      stmt.run(refreshToken);
    }

    return result;
  },

  // 保存用户授权同意
  async saveUserConsent(userId: string, clientId: string, scope: string): Promise<void> {
    const db = getDatabase();
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_consents (id, user_id, client_id, scope, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(id, userId, clientId, scope);
  },

  // 检查用户是否已授权
  async checkUserConsent(userId: string, clientId: string): Promise<string | null> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT scope FROM user_consents WHERE user_id = ? AND client_id = ?
    `);
    const row = stmt.get(userId, clientId) as { scope: string } | undefined;

    return row?.scope || null;
  },
};
