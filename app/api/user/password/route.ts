/**
 * 修改密码API
 * PUT /api/user/password
 */
import { NextRequest } from 'next/server';
import { userService } from '@/lib/services';
import { getAuthContext, successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 参数验证
    if (!currentPassword || !newPassword) {
      return errorResponse('当前密码和新密码为必填项');
    }

    if (newPassword.length < 6) {
      return errorResponse('新密码长度不能少于6位');
    }

    // 验证当前密码
    const isValid = await userService.verifyPassword(auth.user, currentPassword);
    if (!isValid) {
      return errorResponse('当前密码不正确');
    }

    // 更新密码
    await userService.update(auth.user.id, { password: newPassword });

    return successResponse(null, '密码修改成功');
  } catch (error) {
    console.error('修改密码失败:', error);
    return serverErrorResponse('密码修改失败，请稍后重试');
  }
}
