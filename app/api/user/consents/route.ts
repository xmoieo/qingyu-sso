/**
 * 用户已授权应用API
 * GET /api/user/consents - 获取用户已授权的应用列表
 * DELETE /api/user/consents - 撤销授权
 */
import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getAuthContext, successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils';
import { toIsoString } from '@/lib/db/client';

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

    const db = await getDatabase();
    const rows = (await db.query<Record<string, unknown>>(`
      SELECT uc.client_id, uc.scope, uc.created_at,
             a.name as app_name, a.description as app_description,
             u.username as owner_username
      FROM user_consents uc
      JOIN applications a ON uc.client_id = a.client_id
      JOIN users u ON a.user_id = u.id
      WHERE uc.user_id = ?
      ORDER BY uc.created_at DESC
    `, [auth.user.id])).rows;

    const consents: ConsentedApp[] = rows.map((row) => ({
      clientId: row.client_id as string,
      appName: row.app_name as string,
      appDescription: row.app_description as string | null,
      scope: row.scope as string,
      createdAt: toIsoString(row.created_at),
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

    const db = await getDatabase();

    // 删除用户授权记录
    const changes = await db.execute('DELETE FROM user_consents WHERE user_id = ? AND client_id = ?', [auth.user.id, clientId]);

    if (changes === 0) {
      return errorResponse('授权记录不存在');
    }

    // 同时删除相关的访问令牌和刷新令牌
    const tokens = (await db.query<{ id: string }>('SELECT id FROM access_tokens WHERE user_id = ? AND client_id = ?', [
      auth.user.id,
      clientId,
    ])).rows;

    for (const token of tokens) {
      await db.execute('DELETE FROM refresh_tokens WHERE access_token_id = ?', [token.id]);
    }

    await db.execute('DELETE FROM access_tokens WHERE user_id = ? AND client_id = ?', [auth.user.id, clientId]);

    return successResponse(null, '已撤销授权');
  } catch (error) {
    console.error('撤销授权失败:', error);
    return serverErrorResponse();
  }
}
