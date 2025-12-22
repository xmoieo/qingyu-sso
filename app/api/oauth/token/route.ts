/**
 * OAuth2.0 令牌端点
 * POST /api/oauth/token
 */
import { NextRequest, NextResponse } from 'next/server';
import { applicationService, oauthService } from '@/lib/services';
import { buildRateLimitKey, checkRateLimit } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type');

  let body: Record<string, string>;

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries()) as Record<string, string>;
  } else {
    body = await request.json();
  }

  const grantType = body.grant_type;
  const clientId = body.client_id;
  const clientSecret = body.client_secret;

  const rate = checkRateLimit({
    key: buildRateLimitKey(request, 'oauth:token', [clientId || 'no-client']),
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'slow_down',
        error_description: 'Too many requests',
      },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
        },
      }
    );
  }

  // 从Authorization头获取客户端凭证
  let authClientId = clientId;
  let authClientSecret = clientSecret;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Basic ')) {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [id, secret] = decoded.split(':');
    authClientId = authClientId || id;
    authClientSecret = authClientSecret || secret;
  }

  // 验证客户端
  if (!authClientId) {
    return errorResponse('invalid_client', 'client_id is required');
  }

  const app = await applicationService.findByClientId(authClientId);
  if (!app) {
    return errorResponse('invalid_client', 'Client not found');
  }

  // 验证客户端密钥（除非是公共客户端使用PKCE）
  const isPKCE = body.code_verifier !== undefined;
  if (!isPKCE && authClientSecret) {
    const isValid = await applicationService.verifyClientSecret(app, authClientSecret);
    if (!isValid) {
      return errorResponse('invalid_client', 'Invalid client_secret');
    }
  }

  switch (grantType) {
    case 'authorization_code':
      return handleAuthorizationCodeGrant(body, authClientId);

    case 'refresh_token':
      return handleRefreshTokenGrant(body);

    default:
      return errorResponse('unsupported_grant_type', `Grant type '${grantType}' is not supported`);
  }
}

async function handleAuthorizationCodeGrant(body: Record<string, string>, clientId: string) {
  const code = body.code;
  const redirectUri = body.redirect_uri;
  const codeVerifier = body.code_verifier;

  if (!code) {
    return errorResponse('invalid_request', 'code is required');
  }

  if (!redirectUri) {
    return errorResponse('invalid_request', 'redirect_uri is required');
  }

  const result = await oauthService.exchangeToken(
    code,
    clientId,
    redirectUri,
    codeVerifier,
    body.nonce
  );

  if (!result) {
    return errorResponse('invalid_grant', 'Invalid authorization code');
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}

async function handleRefreshTokenGrant(body: Record<string, string>) {
  const refreshToken = body.refresh_token;

  if (!refreshToken) {
    return errorResponse('invalid_request', 'refresh_token is required');
  }

  const result = await oauthService.refreshAccessToken(refreshToken);

  if (!result) {
    return errorResponse('invalid_grant', 'Invalid refresh token');
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}

function errorResponse(error: string, description: string) {
  return NextResponse.json({
    error,
    error_description: description,
  }, {
    status: 400,
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}
