/**
 * 应用程序数据访问层
 */
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Application } from '../db';
import crypto from 'crypto';
import { numberFromCount, toIsoString } from '../db/client';

interface CreateApplicationParams {
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  userId: string;
}

interface UpdateApplicationParams {
  name?: string;
  description?: string;
  redirectUris?: string[];
  scopes?: string[];
}

// 生成客户端ID
function generateClientId(): string {
  return `sso_${crypto.randomBytes(16).toString('hex')}`;
}

// 生成客户端密钥
function generateClientSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 数据库行到应用对象的转换
function rowToApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientSecret: row.client_secret as string,
    name: row.name as string,
    description: row.description as string | undefined,
    redirectUris: row.redirect_uris as string,
    scopes: row.scopes as string,
    userId: row.user_id as string,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export const applicationService = {
  // 创建应用
  async create(params: CreateApplicationParams): Promise<Application> {
    const db = await getDatabase();
    const id = uuidv4();
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    await db.execute(
      `
      INSERT INTO applications (id, client_id, client_secret, name, description, redirect_uris, scopes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        clientId,
        clientSecret,
        params.name,
        params.description || null,
        JSON.stringify(params.redirectUris),
        JSON.stringify(params.scopes),
        params.userId,
      ]
    );

    return this.findById(id) as Promise<Application>;
  },

  // 根据ID查找应用
  async findById(id: string): Promise<Application | null> {
    const db = await getDatabase();
    const row = await db.queryOne<Record<string, unknown>>('SELECT * FROM applications WHERE id = ?', [id]);
    return row ? rowToApplication(row) : null;
  },

  // 根据客户端ID查找应用
  async findByClientId(clientId: string): Promise<Application | null> {
    const db = await getDatabase();
    const row = await db.queryOne<Record<string, unknown>>('SELECT * FROM applications WHERE client_id = ?', [clientId]);
    return row ? rowToApplication(row) : null;
  },

  // 验证客户端密钥
  async verifyClientSecret(app: Application, secret: string): Promise<boolean> {
    return app.clientSecret === secret;
  },

  // 更新应用信息
  async update(id: string, params: UpdateApplicationParams): Promise<Application | null> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
    }
    if (params.description !== undefined) {
      updates.push('description = ?');
      values.push(params.description);
    }
    if (params.redirectUris !== undefined) {
      updates.push('redirect_uris = ?');
      values.push(JSON.stringify(params.redirectUris));
    }
    if (params.scopes !== undefined) {
      updates.push('scopes = ?');
      values.push(JSON.stringify(params.scopes));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.execute(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`, values);

    return this.findById(id);
  },

  // 重新生成客户端密钥
  async regenerateSecret(id: string): Promise<string | null> {
    const db = await getDatabase();
    const newSecret = generateClientSecret();

    const changes = await db.execute(
      `UPDATE applications SET client_secret = ?, updated_at = datetime('now') WHERE id = ?`,
      [newSecret, id]
    );

    return changes > 0 ? newSecret : null;
  },

  // 删除应用（同时清理相关的授权数据）
  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    // 先获取应用信息
    const app = await this.findById(id);
    if (!app) {
      return false;
    }

    // 删除相关的刷新令牌
    await db.execute(`
      DELETE FROM refresh_tokens WHERE access_token_id IN (
        SELECT id FROM access_tokens WHERE client_id = ?
      )
    `, [app.clientId]);

    // 删除相关的访问令牌
    await db.execute('DELETE FROM access_tokens WHERE client_id = ?', [app.clientId]);

    // 删除相关的授权码
    await db.execute('DELETE FROM authorization_codes WHERE client_id = ?', [app.clientId]);

    // 删除用户授权同意记录
    await db.execute('DELETE FROM user_consents WHERE client_id = ?', [app.clientId]);

    // 删除应用权限记录
    await db.execute('DELETE FROM application_permissions WHERE application_id = ?', [id]);

    // 删除授权日志
    await db.execute('DELETE FROM auth_logs WHERE client_id = ?', [app.clientId]);

    // 最后删除应用
    const changes = await db.execute('DELETE FROM applications WHERE id = ?', [id]);
    return changes > 0;
  },

  // 获取用户的所有应用（包含有权限访问的应用）
  async findByUserId(userId: string): Promise<Application[]> {
    const db = await getDatabase();
    // 获取用户创建的应用和有权限访问的应用
    const rows = (await db.query<Record<string, unknown>>(`
      SELECT DISTINCT a.*, 
        CASE WHEN a.user_id = ? THEN 'owner' ELSE ap.permission END as access_type,
        u.username as owner_username
      FROM applications a
      LEFT JOIN application_permissions ap ON a.id = ap.application_id AND ap.user_id = ?
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ? OR ap.user_id = ?
      ORDER BY a.created_at DESC
    `, [userId, userId, userId, userId])).rows;
    return rows.map((row) => ({
      ...rowToApplication(row),
      accessType: row.access_type as string,
      ownerUsername: row.owner_username as string,
    }));
  },

  // 获取所有应用（仅管理员）
  async findAll(page = 1, limit = 20): Promise<{ applications: Application[]; total: number }> {
    const db = await getDatabase();
    const offset = (page - 1) * limit;

    const countRow = await db.queryOne<{ count: unknown }>('SELECT COUNT(*) as count FROM applications');
    const total = numberFromCount(countRow?.count ?? 0);

    const rows = (await db.query<Record<string, unknown>>(`
      SELECT a.*, u.username as owner_username
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT ? OFFSET ?
    `, [limit, offset])).rows;

    return {
      applications: rows.map((row) => ({
        ...rowToApplication(row),
        ownerUsername: row.owner_username as string,
      })),
      total,
    };
  },

  // 添加应用访问权限
  async addPermission(applicationId: string, userId: string, permission: 'view' | 'edit'): Promise<boolean> {
    const db = await getDatabase();
    const id = uuidv4();

    try {
      await db.execute(
        `
        INSERT INTO application_permissions (id, application_id, user_id, permission)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(application_id, user_id) DO UPDATE SET permission = ?
      `,
        [id, applicationId, userId, permission, permission]
      );
      return true;
    } catch {
      return false;
    }
  },

  // 移除应用访问权限
  async removePermission(applicationId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    const changes = await db.execute('DELETE FROM application_permissions WHERE application_id = ? AND user_id = ?', [
      applicationId,
      userId,
    ]);
    return changes > 0;
  },

  // 获取应用的权限列表
  async getPermissions(applicationId: string): Promise<Array<{ userId: string; username: string; permission: string }>> {
    const db = await getDatabase();
    const rows = (await db.query<Record<string, unknown>>(`
      SELECT ap.user_id, ap.permission, u.username
      FROM application_permissions ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.application_id = ?
    `, [applicationId])).rows;
    return rows.map((row) => ({
      userId: row.user_id as string,
      username: row.username as string,
      permission: row.permission as string,
    }));
  },

  // 检查用户对应用的权限
  async checkPermission(applicationId: string, userId: string): Promise<'owner' | 'edit' | 'view' | null> {
    const db = await getDatabase();
    
    // 检查是否是所有者
    const app = await db.queryOne<{ user_id: string }>('SELECT user_id FROM applications WHERE id = ?', [applicationId]);
    
    if (!app) return null;
    if (app.user_id === userId) return 'owner';

    // 检查权限表
    const perm = await db.queryOne<{ permission: string }>(
      'SELECT permission FROM application_permissions WHERE application_id = ? AND user_id = ?',
      [applicationId, userId]
    );
    
    return perm?.permission as 'edit' | 'view' | null;
  },
};
