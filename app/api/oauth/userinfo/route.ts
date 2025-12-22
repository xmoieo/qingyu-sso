/**
 * OIDC UserInfo端点
 * GET /api/oauth/userinfo
 */
import { NextRequest, NextResponse } from 'next/server';
import { oauthService } from '@/lib/services';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({
      error: 'invalid_token',
      error_description: 'Missing or invalid access token',
    }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const tokenData = await oauthService.validateAccessToken(token);

  if (!tokenData) {
    return NextResponse.json({
      error: 'invalid_token',
      error_description: 'Access token is invalid or expired',
    }, { status: 401 });
  }

  try {
    const userInfo = await oauthService.getUserInfo(tokenData.userId, tokenData.scope);
    return NextResponse.json(userInfo);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Failed to retrieve user info',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
