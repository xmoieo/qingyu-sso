/**
 * 处理用户授权同意API
 * POST /api/oauth/consent
 */
import { NextRequest } from 'next/server';
import { applicationService, oauthService, authLogService } from '@/lib/services';
import { getAuthContext, successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

// 验证 redirect_uri 是否匹配允许列表（支持查询参数差异）
function isRedirectUriAllowed(redirectUri: string, allowedUris: string[]): boolean {
  try {
    const redirectUrl = new URL(redirectUri);
    const redirectBase = `${redirectUrl.origin}${redirectUrl.pathname}`;
    
    for (const allowed of allowedUris) {
      try {
        const allowedUrl = new URL(allowed);
        const allowedBase = `${allowedUrl.origin}${allowedUrl.pathname}`;
        
        // 精确匹配基础路径（忽略查询参数和 hash）
        if (redirectBase === allowedBase) {
          return true;
        }
      } catch {
        // 如果配置的不是完整 URL，尝试前缀匹配
        if (redirectUri.startsWith(allowed)) {
          return true;
        }
      }
    }
  } catch {
    // 如果无法解析为 URL，尝试直接匹配
    return allowedUris.includes(redirectUri);
  }
  
  return false;
}

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
    if (!isRedirectUriAllowed(redirectUri, allowedUris)) {
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

    // 记录授权日志
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    await authLogService.log({
      userId: auth.user.id,
      clientId,
      action: 'consent',
      ipAddress,
      userAgent,
    });

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
