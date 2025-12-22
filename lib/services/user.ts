/**
 * 用户数据访问层
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDatabase, User, UserRole } from '../db';
import { numberFromCount, toIsoString } from '../db/client';

interface CreateUserParams {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  gender?: string;
  birthday?: string;
  role?: UserRole;
}

interface UpdateUserParams {
  nickname?: string;
  avatar?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  gender?: string;
  birthday?: string;
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
    gender: row.gender as string | undefined,
    birthday: row.birthday as string | undefined,
    role: row.role as UserRole,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export const userService = {
  // 创建用户
  async create(params: CreateUserParams): Promise<User> {
    const db = await getDatabase();
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(params.password, 10);

    // 检查是否是第一个用户，如果是则设为管理员
    const countRow = await db.queryOne<{ count: unknown }>('SELECT COUNT(*) as count FROM users');
    const count = numberFromCount(countRow?.count ?? 0);
    const role = count === 0 ? UserRole.ADMIN : (params.role || UserRole.USER);

    await db.execute(
      `
      INSERT INTO users (id, username, email, password, nickname, gender, birthday, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        params.username,
        params.email,
        hashedPassword,
        params.nickname || null,
        params.gender || null,
        params.birthday || null,
        role,
      ]
    );

    return this.findById(id) as Promise<User>;
  },

  // 根据ID查找用户
  async findById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.queryOne<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [id]);
    return row ? rowToUser(row) : null;
  },

  // 根据用户名查找用户
  async findByUsername(username: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.queryOne<Record<string, unknown>>('SELECT * FROM users WHERE username = ?', [username]);
    return row ? rowToUser(row) : null;
  },

  // 根据邮箱查找用户
  async findByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.queryOne<Record<string, unknown>>('SELECT * FROM users WHERE email = ?', [email]);
    return row ? rowToUser(row) : null;
  },

  // 验证密码
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  },

  // 更新用户信息
  async update(id: string, params: UpdateUserParams): Promise<User | null> {
    const db = await getDatabase();
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
    if (params.gender !== undefined) {
      updates.push('gender = ?');
      values.push(params.gender);
    }
    if (params.birthday !== undefined) {
      updates.push('birthday = ?');
      values.push(params.birthday);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    return this.findById(id);
  },

  // 删除用户
  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const changes = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    return changes > 0;
  },

  // 获取所有用户
  async findAll(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const db = await getDatabase();
    const offset = (page - 1) * limit;

    const countRow = await db.queryOne<{ count: unknown }>('SELECT COUNT(*) as count FROM users');
    const total = numberFromCount(countRow?.count ?? 0);

    const rows = (await db.query<Record<string, unknown>>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    )).rows;

    return {
      users: rows.map(rowToUser),
      total,
    };
  },

  // 根据角色获取用户
  async findByRole(role: UserRole): Promise<User[]> {
    const db = await getDatabase();
    const rows = (await db.query<Record<string, unknown>>(
      'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC',
      [role]
    )).rows;
    return rows.map(rowToUser);
  },
};
