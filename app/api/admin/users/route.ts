/**
 * 用户管理API（管理员）
 * GET /api/admin/users - 获取用户列表
 * POST /api/admin/users - 创建用户
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
  serverErrorResponse,
} from '@/lib/utils';

// 获取用户列表
export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isAdmin(auth.user)) {
      return forbiddenResponse('仅管理员可访问');
    }

    const result = await userService.findAll();

    // 移除密码字段
    const users = result.users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return successResponse({ users, total: result.total });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return serverErrorResponse('获取用户列表失败');
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isAdmin(auth.user)) {
      return forbiddenResponse('仅管理员可创建用户');
    }

    const body = await request.json();
    const { username, email, password, nickname, role } = body;

    // 参数验证
    if (!username || !email || !password) {
      return errorResponse('用户名、邮箱和密码为必填项');
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return errorResponse('用户名必须是3-20位字母、数字或下划线');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('邮箱格式不正确');
    }

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
      role: role as UserRole || UserRole.USER,
    });

    // 返回用户信息（不含密码）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword, '用户创建成功');
  } catch (error) {
    console.error('创建用户失败:', error);
    return serverErrorResponse('创建用户失败');
  }
}
