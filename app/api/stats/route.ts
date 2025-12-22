/**
 * 统计数据API
 * GET /api/stats
 */
import { getDatabase } from '@/lib/db';
import { getAuthContext, successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const db = getDatabase();

    // 获取用户总数
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    // 获取应用总数
    const appCount = db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number };

    // 获取授权次数（访问令牌数量）
    const authCount = db.prepare('SELECT COUNT(*) as count FROM access_tokens').get() as { count: number };

    return successResponse({
      totalUsers: userCount.count,
      totalApplications: appCount.count,
      totalAuthorizations: authCount.count,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return serverErrorResponse('获取统计数据失败');
  }
}
