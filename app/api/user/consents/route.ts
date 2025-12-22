/**
 * 用户已授权应用API
 * GET /api/user/consents - 获取用户已授权的应用列表
 * DELETE /api/user/consents - 撤销授权
 */
import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getAuthContext, successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';

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

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT uc.client_id, uc.scope, uc.created_at,
             a.name as app_name, a.description as app_description,
             u.username as owner_username
      FROM user_consents uc
      JOIN applications a ON uc.client_id = a.client_id
      JOIN users u ON a.user_id = u.id
      WHERE uc.user_id = ?
      ORDER BY uc.created_at DESC
    `);

    const rows = stmt.all(auth.user.id) as Array<Record<string, unknown>>;

    const consents: ConsentedApp[] = rows.map((row) => ({
      clientId: row.client_id as string,
      appName: row.app_name as string,
      appDescription: row.app_description as string | null,
      scope: row.scope as string,
      createdAt: row.created_at as string,
      ownerUsername: row.owner_username as string,
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

    const db = getDatabase();

    // 删除用户授权记录
    const stmt = db.prepare('DELETE FROM user_consents WHERE user_id = ? AND client_id = ?');
    const result = stmt.run(auth.user.id, clientId);

    if (result.changes === 0) {
      return errorResponse('授权记录不存在');
    }

    // 同时删除相关的访问令牌和刷新令牌
    const tokenStmt = db.prepare('SELECT id FROM access_tokens WHERE user_id = ? AND client_id = ?');
    const tokens = tokenStmt.all(auth.user.id, clientId) as Array<{ id: string }>;

    for (const token of tokens) {
      db.prepare('DELETE FROM refresh_tokens WHERE access_token_id = ?').run(token.id);
    }

    db.prepare('DELETE FROM access_tokens WHERE user_id = ? AND client_id = ?').run(auth.user.id, clientId);

    return successResponse(null, '已撤销授权');
  } catch (error) {
    console.error('撤销授权失败:', error);
    return serverErrorResponse();
  }
}
