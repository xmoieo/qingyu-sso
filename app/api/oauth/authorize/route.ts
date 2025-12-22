/**
 * OAuth2.0 授权端点
 * GET /api/oauth/authorize
 */
import { NextRequest, NextResponse } from 'next/server';
import { applicationService, oauthService } from '@/lib/services';
import { getAuthContext } from '@/lib/utils';
import crypto from 'crypto';

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 验证 redirect_uri 是否匹配允许列表（支持查询参数差异）
function isRedirectUriAllowed(redirectUri: string, allowedUris: string[]): boolean {
  try {
    const redirectUrl = new URL(redirectUri);
    const redirectBase = `${redirectUrl.origin}${redirectUrl.pathname}`;

    return allowedUris.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        const allowedBase = `${allowedUrl.origin}${allowedUrl.pathname}`;
        return redirectBase === allowedBase;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // 获取请求参数
  const responseType = searchParams.get('response_type');
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope') || 'openid';
  const state = searchParams.get('state');
  const nonce = searchParams.get('nonce');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  // OAuth state：若客户端未提供，则生成一个并贯穿整个流程。
  // 说明：标准 OAuth 里 state 通常由客户端生成并校验；这里的生成主要用于避免无 state 的请求导致 CSRF 防护缺口。
  const effectiveState = state || crypto.randomBytes(16).toString('hex');

  // 参数验证
  if (!responseType || responseType !== 'code') {
    return createErrorResponse(redirectUri, 'unsupported_response_type', 'Only code response type is supported', effectiveState);
  }

  if (!clientId) {
    return createErrorResponse(redirectUri, 'invalid_request', 'client_id is required', effectiveState);
  }

  if (!redirectUri) {
    return createErrorResponse(null, 'invalid_request', 'redirect_uri is required', effectiveState);
  }

  // 验证客户端
  const app = await applicationService.findByClientId(clientId);
  if (!app) {
    return createErrorResponse(null, 'invalid_client', 'Client not found', effectiveState);
  }

  // 验证重定向URI
  const allowedUris = JSON.parse(app.redirectUris) as string[];
  if (!isRedirectUriAllowed(redirectUri, allowedUris)) {
    return createErrorResponse(null, 'invalid_request', 'Invalid redirect_uri', effectiveState);
  }

  // 验证scope
  const allowedScopes = JSON.parse(app.scopes) as string[];
  const requestedScopes = scope.split(' ');
  for (const s of requestedScopes) {
    if (!allowedScopes.includes(s)) {
      return createErrorResponse(redirectUri, 'invalid_scope', `Scope '${s}' is not allowed`, effectiveState);
    }
  }

  // 检查用户是否已登录
  const auth = await getAuthContext();

  if (!auth) {
    // 重定向到登录页面，带上当前完整的授权URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('state', effectiveState);
    const currentUrl = `${APP_URL}/api/oauth/authorize?${params.toString()}`;
    const loginUrl = new URL('/login', APP_URL);
    loginUrl.searchParams.set('returnUrl', currentUrl);
    return NextResponse.redirect(loginUrl);
  }

  // 检查用户是否已授权过此应用
  const existingConsent = await oauthService.checkUserConsent(auth.user.id, clientId);

  if (existingConsent) {
    // 用户已授权，直接生成授权码
    const code = await oauthService.createAuthorizationCode({
      clientId,
      userId: auth.user.id,
      redirectUri,
      scope,
      codeChallenge: codeChallenge || undefined,
      codeChallengeMethod: codeChallengeMethod || undefined,
    });

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', effectiveState);

    return NextResponse.redirect(callbackUrl);
  }

  // 重定向到授权同意页面
  const consentUrl = new URL('/oauth/authorize', APP_URL);
  consentUrl.searchParams.set('client_id', clientId);
  consentUrl.searchParams.set('redirect_uri', redirectUri);
  consentUrl.searchParams.set('scope', scope);
  consentUrl.searchParams.set('state', effectiveState);
  if (nonce) {
    consentUrl.searchParams.set('nonce', nonce);
  }
  if (codeChallenge) {
    consentUrl.searchParams.set('code_challenge', codeChallenge);
  }
  if (codeChallengeMethod) {
    consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
  }

  // CSRF 防护：为同意接口下发一次性 CSRF token（双提交 Cookie）。
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const response = NextResponse.redirect(consentUrl);
  response.cookies.set('oauth_csrf', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10分钟
    path: '/',
  });
  return response;
}

function createErrorResponse(redirectUri: string | null, error: string, description: string, state: string | null) {
  if (redirectUri) {
    const url = new URL(redirectUri);
    url.searchParams.set('error', error);
    url.searchParams.set('error_description', description);
    if (state) {
      url.searchParams.set('state', state);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.json({
    error,
    error_description: description,
  }, { status: 400 });
}
