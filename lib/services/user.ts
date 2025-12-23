/**
 * 用户数据访问层
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../db';
import { toIsoString } from '../db/client';
import { prisma } from '../prisma';

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
function modelToUser(row: {
  id: string;
  username: string;
  email: string;
  password: string;
  nickname: string | null;
  avatar: string | null;
  gender: string | null;
  birthday: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    nickname: row.nickname ?? undefined,
    avatar: row.avatar ?? undefined,
    gender: row.gender ?? undefined,
    birthday: row.birthday ?? undefined,
    role: row.role as UserRole,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export const userService = {
  // 创建用户
  async create(params: CreateUserParams): Promise<User> {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(params.password, 10);

    // 检查是否是第一个用户，如果是则设为管理员
    const count = await prisma().user.count();
    const role = count === 0 ? UserRole.ADMIN : (params.role || UserRole.USER);

    await prisma().user.create({
      data: {
        id,
        username: params.username,
        email: params.email,
        password: hashedPassword,
        nickname: params.nickname ?? null,
        gender: params.gender ?? null,
        birthday: params.birthday ?? null,
        role,
      },
    });

    return this.findById(id) as Promise<User>;
  },

  // 根据ID查找用户
  async findById(id: string): Promise<User | null> {
    const row = await prisma().user.findUnique({ where: { id } });
    return row ? modelToUser(row) : null;
  },

  // 根据用户名查找用户
  async findByUsername(username: string): Promise<User | null> {
    const row = await prisma().user.findUnique({ where: { username } });
    return row ? modelToUser(row) : null;
  },

  // 根据邮箱查找用户
  async findByEmail(email: string): Promise<User | null> {
    const row = await prisma().user.findUnique({ where: { email } });
    return row ? modelToUser(row) : null;
  },

  // 验证密码
  async verifyPassword(user: User | null, password: string): Promise<boolean> {
    if (!user) return false;
    return bcrypt.compare(password, user.password);
  },

  // 更新用户信息
  async update(id: string, params: UpdateUserParams): Promise<User | null> {
    const data: Record<string, unknown> = {};

    if (params.nickname !== undefined) data.nickname = params.nickname;
    if (params.avatar !== undefined) data.avatar = params.avatar;
    if (params.email !== undefined) data.email = params.email;
    if (params.password !== undefined) data.password = await bcrypt.hash(params.password, 10);
    if (params.role !== undefined) data.role = params.role;
    if (params.gender !== undefined) data.gender = params.gender;
    if (params.birthday !== undefined) data.birthday = params.birthday;

    if (Object.keys(data).length === 0) return this.findById(id);

    try {
      await prisma().user.update({ where: { id }, data });
    } catch {
      return null;
    }

    return this.findById(id);
  },

  // 删除用户
  async delete(id: string): Promise<boolean> {
    try {
      await prisma().user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // 获取所有用户
  async findAll(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const total = await prisma().user.count();
    const rows = await prisma().user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      users: rows.map(modelToUser),
      total,
    };
  },

  // 根据角色获取用户
  async findByRole(role: UserRole): Promise<User[]> {
    const rows = await prisma().user.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(modelToUser);
  },
};
