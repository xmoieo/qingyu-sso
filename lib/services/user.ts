/**
 * 用户数据访问层
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDatabase, User, UserRole } from '../db';

interface CreateUserParams {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  role?: UserRole;
}

interface UpdateUserParams {
  nickname?: string;
  avatar?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

// 数据库行到用户对象的转换
function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    email: row.email as string,
    password: row.password as string,
    nickname: row.nickname as string | undefined,
    avatar: row.avatar as string | undefined,
    role: row.role as UserRole,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const userService = {
  // 创建用户
  async create(params: CreateUserParams): Promise<User> {
    const db = getDatabase();
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(params.password, 10);

    // 检查是否是第一个用户，如果是则设为管理员
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const countResult = countStmt.get() as { count: number };
    const role = countResult.count === 0 ? UserRole.ADMIN : (params.role || UserRole.USER);

    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password, nickname, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, params.username, params.email, hashedPassword, params.nickname || null, role);

    return this.findById(id) as Promise<User>;
  },

  // 根据ID查找用户
  async findById(id: string): Promise<User | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? rowToUser(row) : null;
  },

  // 根据用户名查找用户
  async findByUsername(username: string): Promise<User | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const row = stmt.get(username) as Record<string, unknown> | undefined;
    return row ? rowToUser(row) : null;
  },

  // 根据邮箱查找用户
  async findByEmail(email: string): Promise<User | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as Record<string, unknown> | undefined;
    return row ? rowToUser(row) : null;
  },

  // 验证密码
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  },

  // 更新用户信息
  async update(id: string, params: UpdateUserParams): Promise<User | null> {
    const db = getDatabase();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (params.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(params.nickname);
    }
    if (params.avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(params.avatar);
    }
    if (params.email !== undefined) {
      updates.push('email = ?');
      values.push(params.email);
    }
    if (params.password !== undefined) {
      updates.push('password = ?');
      values.push(await bcrypt.hash(params.password, 10));
    }
    if (params.role !== undefined) {
      updates.push('role = ?');
      values.push(params.role);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  },

  // 删除用户
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // 获取所有用户
  async findAll(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const countResult = countStmt.get() as { count: number };

    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?');
    const rows = stmt.all(limit, offset) as Record<string, unknown>[];

    return {
      users: rows.map(rowToUser),
      total: countResult.count,
    };
  },

  // 根据角色获取用户
  async findByRole(role: UserRole): Promise<User[]> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC');
    const rows = stmt.all(role) as Record<string, unknown>[];
    return rows.map(rowToUser);
  },
};
