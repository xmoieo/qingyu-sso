/**
 * 搜索用户API
 * GET /api/users/search?q=username
 */
import { NextRequest } from 'next/server';
import { getAuthContext, successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/utils';
import { isDeveloperOrAdmin } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    if (!isDeveloperOrAdmin(auth.user)) {
      return forbiddenResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return successResponse([]);
    }

    const rows = await prisma().user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { nickname: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        role: true,
      },
      take: 10,
    });

    const users = rows.map((row) => ({
      id: row.id,
      username: row.username,
      nickname: row.nickname,
      email: row.email,
      role: row.role,
    }));

    return successResponse(users);
  } catch (error) {
    console.error('搜索用户失败:', error);
    return serverErrorResponse();
  }
}
