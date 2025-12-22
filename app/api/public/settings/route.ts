/**
 * Public settings API
 * GET /api/public/settings
 */
import { settingsService } from '@/lib/services';
import { successResponse, serverErrorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const settings = await settingsService.getAll();
    return successResponse({
      logoUrl: settings.logoUrl,
      copyrightHtml: settings.copyrightHtml,
    });
  } catch (error) {
    console.error('获取公开设置失败:', error);
    return serverErrorResponse();
  }
}
