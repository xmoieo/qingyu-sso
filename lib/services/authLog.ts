/**
 * 授权日志服务
 */
import { v4 as uuidv4 } from 'uuid';
import { toIsoString } from '../db/client';
import { prisma } from '../prisma';

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
  async log(params: {
    userId: string;
    clientId: string;
    action: 'authorize' | 'consent' | 'token' | 'revoke';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const id = uuidv4();

    await prisma().authLog.create({
      data: {
        id,
        userId: params.userId,
        clientId: params.clientId,
        action: params.action,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  },

  // 获取用户的授权日志
  async getByUserId(userId: string, page = 1, pageSize = 20): Promise<{ logs: AuthLog[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const total = await prisma().authLog.count({ where: { userId } });

    const rows = await prisma().authLog.findMany({
      where: { userId },
      include: {
        user: { select: { username: true } },
        application: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: offset,
    });

    return {
      logs: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        clientId: row.clientId,
        action: row.action,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: toIsoString(row.createdAt),
        username: row.user.username,
        applicationName: row.application.name,
      })),
      total,
    };
  },

  // 获取所有授权日志（管理员）
  async getAll(page = 1, pageSize = 20): Promise<{ logs: AuthLog[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const total = await prisma().authLog.count();

    const rows = await prisma().authLog.findMany({
      include: {
        user: { select: { username: true } },
        application: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: offset,
    });

    return {
      logs: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        clientId: row.clientId,
        action: row.action,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: toIsoString(row.createdAt),
        username: row.user.username,
        applicationName: row.application.name,
      })),
      total,
    };
  },
};
