/**
 * 获取当前用户信息API
 * GET /api/auth/me
 */
import { getAuthContext, successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import { settingsService } from '@/lib/services';
import { getUserAvatarUrl } from '@/lib/avatar';

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse('未登录或会话已过期');
    }

    const settings = await settingsService.getAll();

    // 返回用户信息（不含密码）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = auth.user;

    return successResponse({
      ...userWithoutPassword,
      avatar: getUserAvatarUrl(auth.user, settings.avatarProvider),
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return serverErrorResponse('获取用户信息失败');
  }
}
