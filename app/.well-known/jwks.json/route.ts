/**
 * JWKS端点 - 提供RS256公钥
 * GET /.well-known/jwks.json
 */
import { NextResponse } from 'next/server';
import { getJWKS } from '@/lib/keys';

export async function GET() {
  try {
    const jwks = await getJWKS();
    return NextResponse.json(jwks);
  } catch (error) {
    console.error('获取JWKS失败:', error);
    return NextResponse.json({ keys: [] });
  }
}
