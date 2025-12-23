/**
 * 用户已授权应用API
 * GET /api/user/consents - 获取用户已授权的应用列表
 * DELETE /api/user/consents - 撤销授权
 */
import { NextRequest } from 'next/server';
import { getAuthContext, successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import { toIsoString } from '@/lib/db/client';
import { prisma } from '@/lib/prisma';

interface ConsentedApp {
  clientId: string;
  appName: string;
  appDescription: string | null;
  scope: string;
  createdAt: string;
  ownerUsername: string;
}

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const rows = await prisma().userConsent.findMany({
      where: { userId: auth.user.id },
      include: {
        application: {
          select: {
            name: true,
            description: true,
            owner: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const consents: ConsentedApp[] = rows.map((row) => ({
      clientId: row.clientId,
      appName: row.application.name,
      appDescription: row.application.description,
      scope: row.scope,
      createdAt: toIsoString(row.createdAt),
      ownerUsername: row.application.owner.username,
    }));

    return successResponse(consents);
  } catch (error) {
    console.error('获取授权应用失败:', error);
    return serverErrorResponse();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return errorResponse('缺少 clientId 参数');
    }

    const ok = await prisma().$transaction(async (tx) => {
      const consent = await tx.userConsent.deleteMany({ where: { userId: auth.user.id, clientId } });
      if (consent.count === 0) return false;

      const tokens = await tx.accessToken.findMany({
        where: { userId: auth.user.id, clientId },
        select: { id: true },
      });

      const ids = tokens.map((t) => t.id);
      if (ids.length > 0) {
        await tx.refreshToken.deleteMany({ where: { accessTokenId: { in: ids } } });
      }

      await tx.accessToken.deleteMany({ where: { userId: auth.user.id, clientId } });
      return true;
    });

    if (!ok) {
      return errorResponse('授权记录不存在');
    }

    return successResponse(null, '已撤销授权');
  } catch (error) {
    console.error('撤销授权失败:', error);
    return serverErrorResponse();
  }
}
