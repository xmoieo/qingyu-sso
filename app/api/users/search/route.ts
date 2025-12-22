/**
 * 搜索用户API
 * GET /api/users/search?q=username
 */
import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getAuthContext, successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/utils';
import { isDeveloperOrAdmin } from '@/lib/utils';

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

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, username, nickname, email, role
      FROM users
      WHERE username LIKE ? OR nickname LIKE ? OR email LIKE ?
      LIMIT 10
    `);

    const searchTerm = `%${query}%`;
    const rows = stmt.all(searchTerm, searchTerm, searchTerm) as Array<Record<string, unknown>>;

    const users = rows.map((row) => ({
      id: row.id as string,
      username: row.username as string,
      nickname: row.nickname as string | null,
      email: row.email as string,
      role: row.role as string,
    }));

    return successResponse(users);
  } catch (error) {
    console.error('搜索用户失败:', error);
    return serverErrorResponse();
  }
}
