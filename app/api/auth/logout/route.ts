/**
 * 用户登出API
 * POST /api/auth/logout
 */
import { NextResponse } from 'next/server';
import { authService } from '@/lib/services';
import { getAuthContext, successResponse, serverErrorResponse } from '@/lib/utils';

export async function POST() {
  try {
    const auth = await getAuthContext();

    if (auth) {
      // 删除会话
      await authService.deleteSession(auth.sessionId);
    }

    // 清除cookie
    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    });

    response.cookies.delete('auth_token');

    return response;
  } catch (error) {
    console.error('登出失败:', error);
    return serverErrorResponse('登出失败，请稍后重试');
  }
}
