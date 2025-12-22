/**
 * 更新个人信息API
 * PUT /api/user/profile
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
    const { nickname, email, gender, birthday } = body;

    // 邮箱格式验证
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('邮箱格式不正确');
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== auth.user.email) {
      const existingUser = await userService.findByEmail(email);
      if (existingUser && existingUser.id !== auth.user.id) {
        return errorResponse('邮箱已被其他用户使用');
      }
    }

    // 生日格式验证
    if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return errorResponse('生日格式不正确，请使用 YYYY-MM-DD 格式');
    }

    // 更新用户信息
    const updatedUser = await userService.update(auth.user.id, {
      nickname,
      email,
      gender,
      birthday,
    });

    if (!updatedUser) {
      return errorResponse('更新失败');
    }

    // 返回用户信息（不含密码）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;

    return successResponse(userWithoutPassword, '个人信息更新成功');
  } catch (error) {
    console.error('更新个人信息失败:', error);
    return serverErrorResponse('更新失败，请稍后重试');
  }
}
