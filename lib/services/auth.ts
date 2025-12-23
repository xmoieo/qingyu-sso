/**
 * 认证服务 - 处理登录、会话、JWT等
 */
import { v4 as uuidv4 } from 'uuid';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { User, Session } from '../db';
import { userService } from './user';
import { toIsoString } from '../db/client';
import { prisma } from '../prisma';

const JWT_SECRET: Secret | undefined = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
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
function modelToSession(row: { id: string; userId: string; token: string; expiresAt: Date; createdAt: Date }): Session {
  return {
    id: row.id,
    userId: row.userId,
    token: row.token,
    expiresAt: toIsoString(row.expiresAt),
    createdAt: toIsoString(row.createdAt),
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

    // 【安全修复】登录成功后删除该用户所有旧会话，防止会话固定攻击
    // 这确保攻击者无法利用预先设置的会话
    await this.deleteUserSessions(user.id);

    // 创建新会话（新的会话ID）
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
    const id = uuidv4();
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const row = await prisma().session.create({
      data: {
        id,
        userId,
        token,
        expiresAt,
      },
    });

    return modelToSession(row);
  },

  // 验证会话
  async validateSession(sessionId: string): Promise<Session | null> {
    const row = await prisma().session.findFirst({
      where: {
        id: sessionId,
        expiresAt: { gt: new Date() },
      },
    });

    return row ? modelToSession(row) : null;
  },

  // 删除会话（登出）
  async deleteSession(sessionId: string): Promise<boolean> {
    const res = await prisma().session.deleteMany({ where: { id: sessionId } });
    return res.count > 0;
  },

  // 删除用户所有会话
  async deleteUserSessions(userId: string): Promise<void> {
    await prisma().session.deleteMany({ where: { userId } });
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
    const res = await prisma().session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    return res.count;
  },
};
