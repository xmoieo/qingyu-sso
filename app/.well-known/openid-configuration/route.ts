/**
 * OIDC发现端点
 * GET /.well-known/openid-configuration
 */
import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET() {
  const config = {
    // 发行者
    issuer: APP_URL,

    // 端点
    authorization_endpoint: `${APP_URL}/api/oauth/authorize`,
    token_endpoint: `${APP_URL}/api/oauth/token`,
    userinfo_endpoint: `${APP_URL}/api/oauth/userinfo`,
    revocation_endpoint: `${APP_URL}/api/oauth/revoke`,
    jwks_uri: `${APP_URL}/.well-known/jwks.json`,

    // 支持的响应类型
    response_types_supported: ['code'],

    // 支持的授权类型
    grant_types_supported: ['authorization_code', 'refresh_token'],

    // 支持的主题标识符类型
    subject_types_supported: ['public'],

    // 支持的ID Token签名算法
    id_token_signing_alg_values_supported: ['HS256'],

    // 支持的scope
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],

    // 支持的Token端点认证方法
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],

    // 支持的claim
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'auth_time',
      'nonce',
      'name',
      'preferred_username',
      'email',
      'email_verified',
    ],

    // 支持PKCE
    code_challenge_methods_supported: ['plain', 'S256'],
  };

  return NextResponse.json(config);
}
