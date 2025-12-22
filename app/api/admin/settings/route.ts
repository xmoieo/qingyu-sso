/**
 * 系统设置API
 * GET/PUT /api/admin/settings
 */
import { NextRequest } from 'next/server';
import { settingsService } from '@/lib/services';
import { getAuthContext, successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/utils';
import { UserRole } from '@/lib/types';

// 获取系统设置
export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.user.role !== UserRole.ADMIN) {
      return forbiddenResponse();
    }

    const settings = await settingsService.getAll();
    return successResponse(settings);
  } catch (error) {
    console.error('获取系统设置失败:', error);
    return serverErrorResponse();
  }
}

// 更新系统设置
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.user.role !== UserRole.ADMIN) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { allowRegistration, avatarProvider } = body;

    await settingsService.updateAll({
      allowRegistration,
      avatarProvider,
    });

    const settings = await settingsService.getAll();
    return successResponse(settings, '设置已更新');
  } catch (error) {
    console.error('更新系统设置失败:', error);
    return serverErrorResponse();
  }
}
