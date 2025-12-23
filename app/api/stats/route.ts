/**
 * 统计数据API
 * GET /api/stats
 */
import { getAuthContext, successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const [totalUsers, totalApplications, totalAuthorizations] = await Promise.all([
      prisma().user.count(),
      prisma().application.count(),
      prisma().accessToken.count(),
    ]);

    return successResponse({
      totalUsers,
      totalApplications,
      totalAuthorizations,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return serverErrorResponse('获取统计数据失败');
  }
}
