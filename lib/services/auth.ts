/**
 * 认证服务 - 处理登录、会话、JWT等
 */
import { v4 as uuidv4 } from 'uuid';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { getDatabase, User, Session } from '../db';
import { userService } from './user';
import { toIsoString } from '../db/client';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  sessionId: string;
}

export interface LoginResult {
  user: Omit<User, 'password'>;
  token: string;
  expiresAt: string;
}

// 数据库行到会话对象的转换
function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    token: row.token as string,
    expiresAt: toIsoString(row.expires_at),
    createdAt: toIsoString(row.created_at),
  };
}

export const authService = {
  // 用户登录
  async login(usernameOrEmail: string, password: string): Promise<LoginResult | null> {
    // 尝试通过用户名或邮箱查找用户
    let user = await userService.findByUsername(usernameOrEmail);
    if (!user) {
      user = await userService.findByEmail(usernameOrEmail);
    }

    if (!user) {
      return null;
    }

    // 验证密码
    const isValid = await userService.verifyPassword(user, password);
    if (!isValid) {
      return null;
    }

    // 创建会话
    const session = await this.createSession(user.id);

    // 生成JWT
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId: session.id,
    });

    // 返回用户信息（不含密码）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      expiresAt: session.expiresAt,
    };
  },

  // 创建会话
  async createSession(userId: string): Promise<Session> {
    const db = await getDatabase();
    const id = uuidv4();
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.execute(
      `
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `,
      [id, userId, token, expiresAt]
    );

    return { id, userId, token, expiresAt, createdAt: new Date().toISOString() };
  },

  // 验证会话
  async validateSession(sessionId: string): Promise<Session | null> {
    const db = await getDatabase();
    const row = await db.queryOne<Record<string, unknown>>(
      "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')",
      [sessionId]
    );
    return row ? rowToSession(row) : null;
  },

  // 删除会话（登出）
  async deleteSession(sessionId: string): Promise<boolean> {
    const db = await getDatabase();
    const changes = await db.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
    return changes > 0;
  },

  // 删除用户所有会话
  async deleteUserSessions(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
  },

  // 生成JWT
  generateToken(payload: TokenPayload): string {
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
    return jwt.sign(payload, JWT_SECRET, options);
  },

  // 验证JWT
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  },

  // 清理过期会话
  async cleanExpiredSessions(): Promise<number> {
    const db = await getDatabase();
    const changes = await db.execute("DELETE FROM sessions WHERE expires_at <= datetime('now')");
    return changes;
  },
};
