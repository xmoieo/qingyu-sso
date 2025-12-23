/**
 * 应用程序数据访问层
 */
import { v4 as uuidv4 } from 'uuid';
import { Application } from '../db';
import crypto from 'crypto';
import { toIsoString } from '../db/client';
import { prisma } from '../prisma';

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
function modelToApplication(row: {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  description: string | null;
  redirectUris: string;
  scopes: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}): Application {
  return {
    id: row.id,
    clientId: row.clientId,
    clientSecret: row.clientSecret,
    name: row.name,
    description: row.description ?? undefined,
    redirectUris: row.redirectUris,
    scopes: row.scopes,
    userId: row.userId,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export const applicationService = {
  // 创建应用
  async create(params: CreateApplicationParams): Promise<Application> {
    const id = uuidv4();
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    await prisma().application.create({
      data: {
        id,
        clientId,
        clientSecret,
        name: params.name,
        description: params.description ?? null,
        redirectUris: JSON.stringify(params.redirectUris),
        scopes: JSON.stringify(params.scopes),
        userId: params.userId,
      },
    });

    return this.findById(id) as Promise<Application>;
  },

  // 根据ID查找应用
  async findById(id: string): Promise<Application | null> {
    const row = await prisma().application.findUnique({ where: { id } });
    return row ? modelToApplication(row) : null;
  },

  // 根据客户端ID查找应用
  async findByClientId(clientId: string): Promise<Application | null> {
    const row = await prisma().application.findUnique({ where: { clientId } });
    return row ? modelToApplication(row) : null;
  },

  // 验证客户端密钥
  async verifyClientSecret(app: Application, secret: string): Promise<boolean> {
    return app.clientSecret === secret;
  },

  // 更新应用信息
  async update(id: string, params: UpdateApplicationParams): Promise<Application | null> {
    const data: Record<string, unknown> = {};
    if (params.name !== undefined) data.name = params.name;
    if (params.description !== undefined) data.description = params.description;
    if (params.redirectUris !== undefined) data.redirectUris = JSON.stringify(params.redirectUris);
    if (params.scopes !== undefined) data.scopes = JSON.stringify(params.scopes);

    if (Object.keys(data).length === 0) return this.findById(id);

    try {
      await prisma().application.update({ where: { id }, data });
    } catch {
      return null;
    }

    return this.findById(id);
  },

  // 重新生成客户端密钥
  async regenerateSecret(id: string): Promise<string | null> {
    const newSecret = generateClientSecret();

    const res = await prisma().application.updateMany({
      where: { id },
      data: { clientSecret: newSecret },
    });

    return res.count > 0 ? newSecret : null;
  },

  // 删除应用（同时清理相关的授权数据）
  async delete(id: string): Promise<boolean> {
    return prisma().$transaction(async (tx) => {
      const app = await tx.application.findUnique({ where: { id } });
      if (!app) return false;

      await tx.refreshToken.deleteMany({
        where: {
          accessToken: {
            clientId: app.clientId,
          },
        },
      });

      await tx.accessToken.deleteMany({ where: { clientId: app.clientId } });
      await tx.authorizationCode.deleteMany({ where: { clientId: app.clientId } });
      await tx.userConsent.deleteMany({ where: { clientId: app.clientId } });
      await tx.applicationPermission.deleteMany({ where: { applicationId: id } });
      await tx.authLog.deleteMany({ where: { clientId: app.clientId } });

      await tx.application.delete({ where: { id } });
      return true;
    });
  },

  // 获取用户的所有应用（包含有权限访问的应用）
  async findByUserId(userId: string): Promise<Application[]> {
    const rows = await prisma().application.findMany({
      where: {
        OR: [
          { userId },
          { permissions: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { username: true } },
        permissions: {
          where: { userId },
          select: { permission: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => {
      const accessType = row.userId === userId ? 'owner' : (row.permissions[0]?.permission ?? 'view');
      return {
        ...modelToApplication(row),
        accessType,
        ownerUsername: row.owner.username,
      };
    });
  },

  // 获取所有应用（仅管理员）
  async findAll(page = 1, limit = 20): Promise<{ applications: Application[]; total: number }> {
    const offset = (page - 1) * limit;

    const total = await prisma().application.count();
    const rows = await prisma().application.findMany({
      include: { owner: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      applications: rows.map((row) => ({
        ...modelToApplication(row),
        ownerUsername: row.owner.username,
      })),
      total,
    };
  },

  // 添加应用访问权限
  async addPermission(applicationId: string, userId: string, permission: 'view' | 'edit'): Promise<boolean> {
    const id = uuidv4();
    try {
      await prisma().applicationPermission.upsert({
        where: {
          applicationId_userId: {
            applicationId,
            userId,
          },
        },
        create: {
          id,
          applicationId,
          userId,
          permission,
        },
        update: {
          permission,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  // 移除应用访问权限
  async removePermission(applicationId: string, userId: string): Promise<boolean> {
    const res = await prisma().applicationPermission.deleteMany({ where: { applicationId, userId } });
    return res.count > 0;
  },

  // 获取应用的权限列表
  async getPermissions(applicationId: string): Promise<Array<{ userId: string; username: string; permission: string }>> {
    const rows = await prisma().applicationPermission.findMany({
      where: { applicationId },
      include: { user: { select: { username: true } } },
    });

    return rows.map((row) => ({
      userId: row.userId,
      username: row.user.username,
      permission: row.permission,
    }));
  },

  // 检查用户对应用的权限
  async checkPermission(applicationId: string, userId: string): Promise<'owner' | 'edit' | 'view' | null> {
    const app = await prisma().application.findUnique({ where: { id: applicationId }, select: { userId: true } });
    if (!app) return null;
    if (app.userId === userId) return 'owner';

    const perm = await prisma().applicationPermission.findUnique({
      where: { applicationId_userId: { applicationId, userId } },
      select: { permission: true },
    });

    return (perm?.permission as 'edit' | 'view' | undefined) ?? null;
  },
};
