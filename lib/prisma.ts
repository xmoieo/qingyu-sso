import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig } from './db/config';

type SupportedDbType = 'sqlite' | 'postgresql' | 'mysql' | 'mariadb';

function encodeUriComponent(value: string): string {
  return encodeURIComponent(value);
}

function buildPostgresUrl(cfg: NonNullable<ReturnType<typeof getDatabaseConfig>['postgresql']>): string {
  const user = encodeUriComponent(cfg.user);
  const password = encodeUriComponent(cfg.password ?? '');
  const auth = password ? `${user}:${password}` : user;
  return `postgresql://${auth}@${cfg.host}:${cfg.port}/${cfg.database}`;
}

function buildMysqlUrl(cfg: NonNullable<ReturnType<typeof getDatabaseConfig>['mysql']>): string {
  const user = encodeUriComponent(cfg.user);
  const password = encodeUriComponent(cfg.password ?? '');
  const auth = password ? `${user}:${password}` : user;
  return `mysql://${auth}@${cfg.host}:${cfg.port}/${cfg.database}`;
}

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;

  const cfg = getDatabaseConfig();

  if (cfg.type === 'sqlite') {
    const sqlitePath = cfg.sqlite?.path ?? './data/sso.db';
    process.env.DATABASE_URL = `file:${sqlitePath}`;
    return;
  }

  if (cfg.type === 'postgresql' && cfg.postgresql) {
    process.env.DATABASE_URL = buildPostgresUrl(cfg.postgresql);
    return;
  }

  if ((cfg.type === 'mysql' || cfg.type === 'mariadb') && cfg.mysql) {
    process.env.DATABASE_URL = buildMysqlUrl(cfg.mysql);
    return;
  }

  throw new Error('DATABASE_URL is required or DB_TYPE-specific env vars are missing.');
}

declare global {
  var __prisma: PrismaClient | undefined;
}

export function prisma(): PrismaClient {
  ensureDatabaseUrl();

  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  }

  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient();
  }

  return globalThis.__prisma;
}

export function getExpectedDbType(): SupportedDbType {
  return (process.env.DB_TYPE as SupportedDbType | undefined) ?? 'sqlite';
}
