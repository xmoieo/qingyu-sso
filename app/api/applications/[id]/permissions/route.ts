/**
 * 应用程序权限管理API
 * GET /api/applications/[id]/permissions - 获取权限列表
 * POST /api/applications/[id]/permissions - 添加权限
 * DELETE /api/applications/[id]/permissions - 移除权限
 */
import { NextRequest } from 'next/server';
import { applicationService, userService } from '@/lib/services';
import {
  getAuthContext,
  isDeveloperOrAdmin,
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

// 获取权限列表
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse();
    }

    const { id } = await params;
    const app = await applicationService.findById(id);

    if (!app) {
      return notFoundResponse('应用不存在');
    }

    // 只有所有者和管理员可以查看权限
    const permission = await applicationService.checkPermission(id, auth.user.id);
    if (permission !== 'owner' && auth.user.role !== 'admin') {
      return forbiddenResponse('无权查看此应用的权限设置');
    }

    const permissions = await applicationService.getPermissions(id);
    return successResponse(permissions);
  } catch (error) {
    console.error('获取权限列表失败:', error);
    return serverErrorResponse();
  }
}

// 添加权限
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse();
    }

    const { id } = await params;
    const app = await applicationService.findById(id);

    if (!app) {
      return notFoundResponse('应用不存在');
    }

    // 只有所有者和管理员可以管理权限
    const permission = await applicationService.checkPermission(id, auth.user.id);
    if (permission !== 'owner' && auth.user.role !== 'admin') {
      return forbiddenResponse('无权管理此应用的权限');
    }

    const body = await request.json();
    const { username, permissionType } = body;

    if (!username) {
      return errorResponse('请输入用户名');
    }

    if (!['view', 'edit'].includes(permissionType)) {
      return errorResponse('权限类型无效');
    }

    // 查找用户
    const user = await userService.findByUsername(username);
    if (!user) {
      return errorResponse('用户不存在');
    }

    // 不能给自己添加权限
    if (user.id === app.userId) {
      return errorResponse('不能给应用所有者添加权限');
    }

    const success = await applicationService.addPermission(id, user.id, permissionType);
    if (!success) {
      return errorResponse('添加权限失败');
    }

    return successResponse(null, '权限添加成功');
  } catch (error) {
    console.error('添加权限失败:', error);
    return serverErrorResponse();
  }
}

// 移除权限
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse();
    }

    const { id } = await params;
    const app = await applicationService.findById(id);

    if (!app) {
      return notFoundResponse('应用不存在');
    }

    // 只有所有者和管理员可以管理权限
    const permission = await applicationService.checkPermission(id, auth.user.id);
    if (permission !== 'owner' && auth.user.role !== 'admin') {
      return forbiddenResponse('无权管理此应用的权限');
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return errorResponse('缺少用户ID');
    }

    const success = await applicationService.removePermission(id, userId);
    if (!success) {
      return errorResponse('移除权限失败');
    }

    return successResponse(null, '权限已移除');
  } catch (error) {
    console.error('移除权限失败:', error);
    return serverErrorResponse();
  }
}
