/**
 * OAuth2.0服务层
 */
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { JWTPayload } from 'jose';
import { signJWT } from '../keys';
import { prisma } from '../prisma';
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRES_IN);

    await prisma().authorizationCode.create({
      data: {
        code,
        clientId: params.clientId,
        userId: params.userId,
        redirectUri: params.redirectUri,
        scope: params.scope,
        codeChallenge: params.codeChallenge ?? null,
        codeChallengeMethod: params.codeChallengeMethod ?? null,
        expiresAt,
      },
    });

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
    const row = await prisma().authorizationCode.findUnique({ where: { code } });
    if (!row) return null;
    if (row.expiresAt <= new Date()) return null;

    // 删除已使用的授权码（一次性使用）
    await prisma().authorizationCode.delete({ where: { code } });

    return {
      clientId: row.clientId,
      userId: row.userId,
      redirectUri: row.redirectUri,
      scope: row.scope ?? '',
      codeChallenge: row.codeChallenge ?? undefined,
      codeChallengeMethod: row.codeChallengeMethod ?? undefined,
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
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN);

    await prisma().accessToken.create({
      data: {
        id,
        token,
        clientId,
        userId,
        scope,
        expiresAt,
      },
    });

    return { accessToken: token, accessTokenId: id, expiresAt };
  },

  // 创建刷新令牌
  async createRefreshToken(accessTokenId: string): Promise<string> {
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

    await prisma().refreshToken.create({
      data: {
        id,
        token,
        accessTokenId,
        expiresAt,
      },
    });

    return token;
  },

  // 验证访问令牌
  async validateAccessToken(token: string): Promise<{
    userId: string;
    clientId: string;
    scope: string;
  } | null> {
    const row = await prisma().accessToken.findUnique({ where: { token } });
    if (!row) return null;
    if (row.expiresAt <= new Date()) return null;

    return {
      userId: row.userId,
      clientId: row.clientId,
      scope: row.scope ?? '',
    };
  },

  // 验证刷新令牌
  async validateRefreshToken(token: string): Promise<{
    accessTokenId: string;
    userId: string;
    clientId: string;
    scope: string;
  } | null> {
    const row = await prisma().refreshToken.findUnique({
      where: { token },
      include: { accessToken: { select: { userId: true, clientId: true, scope: true } } },
    });

    if (!row) return null;
    if (row.expiresAt <= new Date()) return null;

    return {
      accessTokenId: row.accessTokenId,
      userId: row.accessToken.userId,
      clientId: row.accessToken.clientId,
      scope: row.accessToken.scope ?? '',
    };
  },

  // 撤销令牌
  async revokeToken(token: string): Promise<boolean> {
    const access = await prisma().accessToken.deleteMany({ where: { token } });
    if (access.count > 0) return true;

    const refresh = await prisma().refreshToken.deleteMany({ where: { token } });
    return refresh.count > 0;
  },

  // 生成ID Token (OIDC) - 使用RS256算法
  async generateIdToken(userId: string, clientId: string, nonce?: string): Promise<string> {
    const user = await prisma().user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('用户不存在');

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
    const user = await prisma().user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('用户不存在');

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
      await prisma().refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    return result;
  },

  // 保存用户授权同意
  async saveUserConsent(userId: string, clientId: string, scope: string): Promise<void> {
    const id = uuidv4();

    await prisma().userConsent.upsert({
      where: { userId_clientId: { userId, clientId } },
      create: { id, userId, clientId, scope },
      update: { scope, createdAt: new Date() },
    });
  },

  // 检查用户是否已授权
  async checkUserConsent(userId: string, clientId: string): Promise<string | null> {
    const row = await prisma().userConsent.findUnique({
      where: { userId_clientId: { userId, clientId } },
      select: { scope: true },
    });

    return row?.scope ?? null;
  },
};
