/**
 * 统计数据API
 * GET /api/stats
 */
import { getDatabase } from '@/lib/db';
import { getAuthContext, successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import { numberFromCount } from '@/lib/db/client';

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const db = await getDatabase();

    // 获取用户总数
    const userCount = await db.queryOne<{ count: unknown }>('SELECT COUNT(*) as count FROM users');

    // 获取应用总数
    const appCount = await db.queryOne<{ count: unknown }>('SELECT COUNT(*) as count FROM applications');

    // 获取授权次数（访问令牌数量）
    const authCount = await db.queryOne<{ count: unknown }>('SELECT COUNT(*) as count FROM access_tokens');

    return successResponse({
      totalUsers: numberFromCount(userCount?.count ?? 0),
      totalApplications: numberFromCount(appCount?.count ?? 0),
      totalAuthorizations: numberFromCount(authCount?.count ?? 0),
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return serverErrorResponse('获取统计数据失败');
  }
}
