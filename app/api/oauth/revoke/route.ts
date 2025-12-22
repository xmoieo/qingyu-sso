/**
 * OAuth2.0 令牌撤销端点
 * POST /api/oauth/revoke
 */
import { NextRequest, NextResponse } from 'next/server';
import { oauthService } from '@/lib/services';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type');

  let body: Record<string, string>;

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries()) as Record<string, string>;
  } else {
    body = await request.json();
  }

  const token = body.token;

  if (!token) {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: 'token is required',
    }, { status: 400 });
  }

  await oauthService.revokeToken(token);

  // 根据RFC 7009，即使令牌不存在也返回200
  return new NextResponse(null, { status: 200 });
}
