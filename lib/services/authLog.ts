/**
 * 授权日志服务
 */
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db';

export interface AuthLog {
  id: string;
  userId: string;
  clientId: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  // 关联信息
  username?: string;
  applicationName?: string;
}

export const authLogService = {
  // 记录授权日志
  log(params: {
    userId: string;
    clientId: string;
    action: 'authorize' | 'consent' | 'token' | 'revoke';
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const db = getDatabase();
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO auth_logs (id, user_id, client_id, action, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.userId,
      params.clientId,
      params.action,
      params.ipAddress || null,
      params.userAgent || null
    );
  },

  // 获取用户的授权日志
  getByUserId(userId: string, page = 1, pageSize = 20): { logs: AuthLog[]; total: number } {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM auth_logs WHERE user_id = ?');
    const countResult = countStmt.get(userId) as { count: number };

    const stmt = db.prepare(`
      SELECT al.*, u.username, a.name as application_name
      FROM auth_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN applications a ON al.client_id = a.client_id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(userId, pageSize, offset) as Array<Record<string, unknown>>;

    return {
      logs: rows.map((row) => ({
        id: row.id as string,
        userId: row.user_id as string,
        clientId: row.client_id as string,
        action: row.action as string,
        ipAddress: row.ip_address as string | null,
        userAgent: row.user_agent as string | null,
        createdAt: row.created_at as string,
        username: row.username as string,
        applicationName: row.application_name as string,
      })),
      total: countResult.count,
    };
  },

  // 获取所有授权日志（管理员）
  getAll(page = 1, pageSize = 20): { logs: AuthLog[]; total: number } {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM auth_logs');
    const countResult = countStmt.get() as { count: number };

    const stmt = db.prepare(`
      SELECT al.*, u.username, a.name as application_name
      FROM auth_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN applications a ON al.client_id = a.client_id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(pageSize, offset) as Array<Record<string, unknown>>;

    return {
      logs: rows.map((row) => ({
        id: row.id as string,
        userId: row.user_id as string,
        clientId: row.client_id as string,
        action: row.action as string,
        ipAddress: row.ip_address as string | null,
        userAgent: row.user_agent as string | null,
        createdAt: row.created_at as string,
        username: row.username as string,
        applicationName: row.application_name as string,
      })),
      total: countResult.count,
    };
  },
};
