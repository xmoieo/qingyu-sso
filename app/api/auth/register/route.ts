/**
 * 用户注册API
 * POST /api/auth/register
 */
import { NextRequest } from 'next/server';
import { userService, settingsService } from '@/lib/services';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // 检查是否允许注册
    if (!(await settingsService.isRegistrationAllowed())) {
      return errorResponse('系统已关闭注册，请联系管理员');
    }

    const body = await request.json();
    const { username, email, password, nickname } = body;

    // 参数验证
    if (!username || !email || !password) {
      return errorResponse('用户名、邮箱和密码为必填项');
    }

    // 用户名格式验证
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return errorResponse('用户名必须是3-20位字母、数字或下划线');
    }

    // 邮箱格式验证
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('邮箱格式不正确');
    }

    // 密码长度验证
    if (password.length < 6) {
      return errorResponse('密码长度不能少于6位');
    }

    // 检查用户名是否已存在
    const existingUsername = await userService.findByUsername(username);
    if (existingUsername) {
      return errorResponse('用户名已被使用');
    }

    // 检查邮箱是否已存在
    const existingEmail = await userService.findByEmail(email);
    if (existingEmail) {
      return errorResponse('邮箱已被注册');
    }

    // 创建用户
    const user = await userService.create({
      username,
      email,
      password,
      nickname,
    });

    // 返回用户信息（不含密码）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword, '注册成功');
  } catch (error) {
    console.error('注册失败:', error);
    return serverErrorResponse('注册失败，请稍后重试');
  }
}
