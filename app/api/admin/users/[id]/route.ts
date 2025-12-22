/**
 * 单个用户管理API（管理员）
 * GET /api/admin/users/[id] - 获取用户详情
 * PUT /api/admin/users/[id] - 更新用户
 * DELETE /api/admin/users/[id] - 删除用户
 */
import { NextRequest } from 'next/server';
import { userService } from '@/lib/services';
import { UserRole } from '@/lib/db';
import {
  getAuthContext,
  isAdmin,
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取用户详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isAdmin(auth.user)) {
      return forbiddenResponse('仅管理员可访问');
    }

    const { id } = await params;
    const user = await userService.findById(id);

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword);
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return serverErrorResponse('获取用户详情失败');
  }
}

// 更新用户
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isAdmin(auth.user)) {
      return forbiddenResponse('仅管理员可修改用户');
    }

    const { id } = await params;
    const user = await userService.findById(id);

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    const body = await request.json();
    const { email, password, nickname, role } = body;

    // 邮箱格式验证
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('邮箱格式不正确');
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== user.email) {
      const existingUser = await userService.findByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return errorResponse('邮箱已被其他用户使用');
      }
    }

    // 密码长度验证
    if (password && password.length < 6) {
      return errorResponse('密码长度不能少于6位');
    }

    // 更新用户信息
    const updatedUser = await userService.update(id, {
      email,
      password: password || undefined,
      nickname,
      role: role as UserRole,
    });

    if (!updatedUser) {
      return errorResponse('更新失败');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;

    return successResponse(userWithoutPassword, '用户更新成功');
  } catch (error) {
    console.error('更新用户失败:', error);
    return serverErrorResponse('更新用户失败');
  }
}

// 删除用户
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isAdmin(auth.user)) {
      return forbiddenResponse('仅管理员可删除用户');
    }

    const { id } = await params;

    // 不能删除自己
    if (id === auth.user.id) {
      return errorResponse('不能删除自己的账户');
    }

    const user = await userService.findById(id);

    if (!user) {
      return notFoundResponse('用户不存在');
    }

    const deleted = await userService.delete(id);

    if (!deleted) {
      return errorResponse('删除失败');
    }

    return successResponse(null, '用户删除成功');
  } catch (error) {
    console.error('删除用户失败:', error);
    return serverErrorResponse('删除用户失败');
  }
}
