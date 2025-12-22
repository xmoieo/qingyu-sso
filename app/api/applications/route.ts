/**
 * 应用管理API
 * GET /api/applications - 获取应用列表
 * POST /api/applications - 创建应用
 */
import { NextRequest } from 'next/server';
import { applicationService } from '@/lib/services';
import {
  getAuthContext,
  isDeveloperOrAdmin,
  isAdmin,
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/utils';

// 获取应用列表
export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse('仅管理员和开发者可访问');
    }

    // 管理员可以看到所有应用，开发者只能看到自己的应用
    let applications;
    if (isAdmin(auth.user)) {
      const result = await applicationService.findAll();
      // 管理端也需要 accessType 才能在前端展示编辑/删除等操作
      applications = result.applications.map((app) => ({
        ...app,
        accessType: 'owner',
      }));
    } else {
      applications = await applicationService.findByUserId(auth.user.id);
    }

    return successResponse({ applications, total: applications.length });
  } catch (error) {
    console.error('获取应用列表失败:', error);
    return serverErrorResponse('获取应用列表失败');
  }
}

// 创建应用
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse('仅管理员和开发者可创建应用');
    }

    const body = await request.json();
    const { name, description, redirectUris, scopes } = body;

    // 参数验证
    if (!name) {
      return errorResponse('应用名称为必填项');
    }

    if (!redirectUris || !Array.isArray(redirectUris) || redirectUris.length === 0) {
      return errorResponse('至少需要一个重定向URI');
    }

    // 验证重定向URI格式
    for (const uri of redirectUris) {
      try {
        new URL(uri);
      } catch {
        return errorResponse(`无效的重定向URI: ${uri}`);
      }
    }

    // 创建应用
    const application = await applicationService.create({
      name,
      description,
      redirectUris,
      scopes: scopes || ['openid', 'profile', 'email'],
      userId: auth.user.id,
    });

    return successResponse(application, '应用创建成功');
  } catch (error) {
    console.error('创建应用失败:', error);
    return serverErrorResponse('创建应用失败');
  }
}
