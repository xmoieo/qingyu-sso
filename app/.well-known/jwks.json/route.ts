/**
 * JWKS端点（简化版，使用HS256对称密钥）
 * GET /.well-known/jwks.json
 */
import { NextResponse } from 'next/server';

export async function GET() {
  // 由于使用HS256对称加密，这里返回空的JWKS
  // 在生产环境中应该使用RSA或EC非对称密钥
  const jwks = {
    keys: [],
  };

  return NextResponse.json(jwks);
}
