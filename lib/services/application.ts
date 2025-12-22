/**
 * 应用程序数据访问层
 */
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, Application } from '../db';
import crypto from 'crypto';

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
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const applicationService = {
  // 创建应用
  async create(params: CreateApplicationParams): Promise<Application> {
    const db = getDatabase();
    const id = uuidv4();
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    const stmt = db.prepare(`
      INSERT INTO applications (id, client_id, client_secret, name, description, redirect_uris, scopes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      clientId,
      clientSecret,
      params.name,
      params.description || null,
      JSON.stringify(params.redirectUris),
      JSON.stringify(params.scopes),
      params.userId
    );

    return this.findById(id) as Promise<Application>;
  },

  // 根据ID查找应用
  async findById(id: string): Promise<Application | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM applications WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? rowToApplication(row) : null;
  },

  // 根据客户端ID查找应用
  async findByClientId(clientId: string): Promise<Application | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM applications WHERE client_id = ?');
    const row = stmt.get(clientId) as Record<string, unknown> | undefined;
    return row ? rowToApplication(row) : null;
  },

  // 验证客户端密钥
  async verifyClientSecret(app: Application, secret: string): Promise<boolean> {
    return app.clientSecret === secret;
  },

  // 更新应用信息
  async update(id: string, params: UpdateApplicationParams): Promise<Application | null> {
    const db = getDatabase();
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

    const stmt = db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  },

  // 重新生成客户端密钥
  async regenerateSecret(id: string): Promise<string | null> {
    const db = getDatabase();
    const newSecret = generateClientSecret();

    const stmt = db.prepare(`UPDATE applications SET client_secret = ?, updated_at = datetime('now') WHERE id = ?`);
    const result = stmt.run(newSecret, id);

    return result.changes > 0 ? newSecret : null;
  },

  // 删除应用
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM applications WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // 获取用户的所有应用
  async findByUserId(userId: string): Promise<Application[]> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId) as Record<string, unknown>[];
    return rows.map(rowToApplication);
  },

  // 获取所有应用
  async findAll(page = 1, limit = 20): Promise<{ applications: Application[]; total: number }> {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM applications');
    const countResult = countStmt.get() as { count: number };

    const stmt = db.prepare('SELECT * FROM applications ORDER BY created_at DESC LIMIT ? OFFSET ?');
    const rows = stmt.all(limit, offset) as Record<string, unknown>[];

    return {
      applications: rows.map(rowToApplication),
      total: countResult.count,
    };
  },
};
