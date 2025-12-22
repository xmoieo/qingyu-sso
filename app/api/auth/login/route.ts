/**
 * 用户登录API
 * POST /api/auth/login
 */
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services';
import { errorResponse, serverErrorResponse, buildRateLimitKey, checkRateLimit } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit({
      key: buildRateLimitKey(request, 'auth:login'),
      limit: 10,
      windowMs: 5 * 60 * 1000,
    });
    if (!rate.allowed) {
      return errorResponse('请求过于频繁，请稍后再试', 429);
    }

    const body = await request.json();
    const { username, password } = body;

    // 参数验证
    if (!username || !password) {
      return errorResponse('用户名/邮箱和密码为必填项');
    }

    // 登录验证
    const result = await authService.login(username, password);
    if (!result) {
      return errorResponse('用户名/邮箱或密码错误', 401);
    }

    // 设置cookie
    const response = NextResponse.json({
      success: true,
      data: result.user,
      message: '登录成功',
    });

    response.cookies.set('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('登录失败:', error);
    return serverErrorResponse('登录失败，请稍后重试');
  }
}
