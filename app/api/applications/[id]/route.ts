/**
 * 单个应用管理API
 * GET /api/applications/[id] - 获取应用详情
 * PUT /api/applications/[id] - 更新应用
 * DELETE /api/applications/[id] - 删除应用
 */
import { NextRequest } from 'next/server';
import { applicationService } from '@/lib/services';
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

// 检查用户是否有权限操作该应用
async function checkAppPermission(appId: string, userId: string, userRole: string): Promise<{ 
  allowed: boolean; 
  app?: Awaited<ReturnType<typeof applicationService.findById>>;
  isOwner: boolean;
  permissionType: 'owner' | 'edit' | 'view' | null;
}> {
  const app = await applicationService.findById(appId);

  if (!app) {
    return { allowed: false, isOwner: false, permissionType: null };
  }

  // 管理员可以操作所有应用
  if (userRole === 'admin') {
    return { allowed: true, app, isOwner: true, permissionType: 'owner' };
  }
  
  // 检查是否是所有者
  if (app.userId === userId) {
    return { allowed: true, app, isOwner: true, permissionType: 'owner' };
  }

  // 检查是否有共享权限
  const permission = await applicationService.checkPermission(appId, userId);
  if (permission === 'edit' || permission === 'view') {
    return { allowed: true, app, isOwner: false, permissionType: permission };
  }

  return { allowed: false, app, isOwner: false, permissionType: null };
}

// 获取应用详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse('仅管理员和开发者可访问');
    }

    const { id } = await params;
    const { allowed, app } = await checkAppPermission(id, auth.user.id, auth.user.role);

    if (!app) {
      return notFoundResponse('应用不存在');
    }

    if (!allowed) {
      return forbiddenResponse('无权访问此应用');
    }

    return successResponse(app);
  } catch (error) {
    console.error('获取应用详情失败:', error);
    return serverErrorResponse('获取应用详情失败');
  }
}

// 更新应用
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse('仅管理员和开发者可修改应用');
    }

    const { id } = await params;
    const { allowed, app, isOwner, permissionType } = await checkAppPermission(id, auth.user.id, auth.user.role);

    if (!app) {
      return notFoundResponse('应用不存在');
    }

    if (!allowed) {
      return forbiddenResponse('无权修改此应用');
    }

    // 共享用户只有 edit 权限才能修改
    if (!isOwner && permissionType !== 'edit') {
      return forbiddenResponse('无权修改此应用');
    }

    const body = await request.json();
    const { name, description, redirectUris, scopes } = body;

    // 共享用户（非所有者）不能修改应用名称
    if (!isOwner && name !== undefined && name !== app.name) {
      return forbiddenResponse('共享用户不能修改应用名称');
    }

    // 验证重定向URI格式
    if (redirectUris) {
      if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
        return errorResponse('至少需要一个重定向URI');
      }

      for (const uri of redirectUris) {
        try {
          new URL(uri);
        } catch {
          return errorResponse(`无效的重定向URI: ${uri}`);
        }
      }
    }

    // 共享用户更新时排除 name 字段
    const updateData = isOwner 
      ? { name, description, redirectUris, scopes }
      : { description, redirectUris, scopes };

    const updatedApp = await applicationService.update(id, updateData);

    if (!updatedApp) {
      return errorResponse('更新失败');
    }

    return successResponse(updatedApp, '应用更新成功');
  } catch (error) {
    console.error('更新应用失败:', error);
    return serverErrorResponse('更新应用失败');
  }
}

// 删除应用
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse('仅管理员和开发者可删除应用');
    }

    const { id } = await params;
    const { app, isOwner } = await checkAppPermission(id, auth.user.id, auth.user.role);

    if (!app) {
      return notFoundResponse('应用不存在');
    }

    // 只有管理员和应用所有者才能删除应用
    if (!isOwner) {
      return forbiddenResponse('只有管理员和应用创建者才能删除应用');
    }

    const deleted = await applicationService.delete(id);

    if (!deleted) {
      return errorResponse('删除失败');
    }

    return successResponse(null, '应用删除成功');
  } catch (error) {
    console.error('删除应用失败:', error);
    return serverErrorResponse('删除应用失败');
  }
}
