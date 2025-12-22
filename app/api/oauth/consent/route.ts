/**
 * 处理用户授权同意API
 * POST /api/oauth/consent
 */
import { NextRequest } from 'next/server';
import { applicationService, oauthService } from '@/lib/services';
import { getAuthContext, successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const {
      clientId,
      redirectUri,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
      approve,
    } = body;

    // 验证客户端
    const app = await applicationService.findByClientId(clientId);
    if (!app) {
      return errorResponse('应用不存在');
    }

    // 验证重定向URI
    const allowedUris = JSON.parse(app.redirectUris) as string[];
    if (!allowedUris.includes(redirectUri)) {
      return errorResponse('无效的重定向URI');
    }

    // 构建回调URL
    const callbackUrl = new URL(redirectUri);

    if (!approve) {
      // 用户拒绝授权
      callbackUrl.searchParams.set('error', 'access_denied');
      callbackUrl.searchParams.set('error_description', 'User denied the authorization request');
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }

      return successResponse({ redirectUrl: callbackUrl.toString() });
    }

    // 用户同意授权，保存授权记录
    await oauthService.saveUserConsent(auth.user.id, clientId, scope);

    // 生成授权码
    const code = await oauthService.createAuthorizationCode({
      clientId,
      userId: auth.user.id,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
    });

    callbackUrl.searchParams.set('code', code);
    if (state) {
      callbackUrl.searchParams.set('state', state);
    }

    return successResponse({ redirectUrl: callbackUrl.toString() });
  } catch (error) {
    console.error('授权处理失败:', error);
    return serverErrorResponse('授权处理失败');
  }
}
