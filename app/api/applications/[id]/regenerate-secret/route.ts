/**
 * 重新生成客户端密钥API
 * POST /api/applications/[id]/regenerate-secret
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

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse('仅管理员和开发者可执行此操作');
    }

    const { id } = await params;
    const app = await applicationService.findById(id);

    if (!app) {
      return notFoundResponse('应用不存在');
    }

    // 管理员可以操作所有应用，开发者只能操作自己的应用
    if (auth.user.role !== 'admin' && app.userId !== auth.user.id) {
      return forbiddenResponse('无权操作此应用');
    }

    const newSecret = await applicationService.regenerateSecret(id);

    if (!newSecret) {
      return errorResponse('重新生成密钥失败');
    }

    return successResponse({ clientSecret: newSecret }, '客户端密钥已重新生成');
  } catch (error) {
    console.error('重新生成密钥失败:', error);
    return serverErrorResponse('重新生成密钥失败');
  }
}
