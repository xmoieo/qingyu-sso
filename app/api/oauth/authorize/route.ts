/**
 * OAuth2.0 授权端点
 * GET /api/oauth/authorize
 */
import { NextRequest, NextResponse } from 'next/server';
import { applicationService, oauthService } from '@/lib/services';
import { getAuthContext } from '@/lib/utils';

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

  // 参数验证
  if (!responseType || responseType !== 'code') {
    return createErrorResponse(redirectUri, 'unsupported_response_type', 'Only code response type is supported', state);
  }

  if (!clientId) {
    return createErrorResponse(redirectUri, 'invalid_request', 'client_id is required', state);
  }

  if (!redirectUri) {
    return createErrorResponse(null, 'invalid_request', 'redirect_uri is required', state);
  }

  // 验证客户端
  const app = await applicationService.findByClientId(clientId);
  if (!app) {
    return createErrorResponse(null, 'invalid_client', 'Client not found', state);
  }

  // 验证重定向URI
  const allowedUris = JSON.parse(app.redirectUris) as string[];
  if (!allowedUris.includes(redirectUri)) {
    return createErrorResponse(null, 'invalid_request', 'Invalid redirect_uri', state);
  }

  // 验证scope
  const allowedScopes = JSON.parse(app.scopes) as string[];
  const requestedScopes = scope.split(' ');
  for (const s of requestedScopes) {
    if (!allowedScopes.includes(s)) {
      return createErrorResponse(redirectUri, 'invalid_scope', `Scope '${s}' is not allowed`, state);
    }
  }

  // 检查用户是否已登录
  const auth = await getAuthContext();

  if (!auth) {
    // 重定向到登录页面，带上当前完整的授权URL
    const currentUrl = `${APP_URL}/api/oauth/authorize?${searchParams.toString()}`;
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
    if (state) {
      callbackUrl.searchParams.set('state', state);
    }

    return NextResponse.redirect(callbackUrl);
  }

  // 重定向到授权同意页面
  const consentUrl = new URL('/oauth/authorize', request.url);
  consentUrl.searchParams.set('client_id', clientId);
  consentUrl.searchParams.set('redirect_uri', redirectUri);
  consentUrl.searchParams.set('scope', scope);
  if (state) {
    consentUrl.searchParams.set('state', state);
  }
  if (nonce) {
    consentUrl.searchParams.set('nonce', nonce);
  }
  if (codeChallenge) {
    consentUrl.searchParams.set('code_challenge', codeChallenge);
  }
  if (codeChallengeMethod) {
    consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
  }

  return NextResponse.redirect(consentUrl);
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
