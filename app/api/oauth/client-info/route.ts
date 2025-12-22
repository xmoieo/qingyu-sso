/**
 * 获取客户端应用信息API
 * GET /api/oauth/client-info
 */
import { NextRequest } from 'next/server';
import { applicationService } from '@/lib/services';
import { getAuthContext, successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const clientId = request.nextUrl.searchParams.get('client_id');

    if (!clientId) {
      return errorResponse('client_id is required');
    }

    const app = await applicationService.findByClientId(clientId);

    if (!app) {
      return errorResponse('应用不存在', 404);
    }

    // 只返回公开信息
    return successResponse({
      id: app.id,
      name: app.name,
      description: app.description,
    });
  } catch (error) {
    console.error('获取应用信息失败:', error);
    return serverErrorResponse('获取应用信息失败');
  }
}
