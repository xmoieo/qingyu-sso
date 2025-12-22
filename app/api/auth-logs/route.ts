/**
 * 授权日志API
 * GET /api/auth-logs
 */
import { NextRequest } from 'next/server';
import { authLogService } from '@/lib/services';
import { getAuthContext, successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/utils';
import { UserRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // 管理员可以查看所有日志，普通用户只能查看自己的
    if (auth.user.role === UserRole.ADMIN) {
      const userId = searchParams.get('userId');
      if (userId) {
        const result = authLogService.getByUserId(userId, page, pageSize);
        return successResponse(result);
      }
      const result = authLogService.getAll(page, pageSize);
      return successResponse(result);
    }

    const result = authLogService.getByUserId(auth.user.id, page, pageSize);
    return successResponse(result);
  } catch (error) {
    console.error('获取授权日志失败:', error);
    return serverErrorResponse();
  }
}
