import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig } from './db/config';
import fs from 'fs';
import path from 'path';

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

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeSqliteDatabaseUrl(databaseUrl: string): string {
  const url = stripWrappingQuotes(databaseUrl);
  if (!url.startsWith('file:')) return url;

  // Prisma SQLite URLs are like: file:./data/sso.db or file:/abs/path/sso.db
  const filePart = url.slice('file:'.length);
  if (!filePart) return url;

  // Leave file://... and other variants untouched.
  if (filePart.startsWith('//')) return url;

  const resolvedPath = path.isAbsolute(filePart) ? filePart : path.resolve(process.cwd(), filePart);

  // Ensure parent dir exists so SQLite can create/open the file.
  const dir = path.dirname(resolvedPath);
  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true });
  }

  return `file:${resolvedPath}`;
}

function normalizeDatabaseUrl(): void {
  const current = process.env.DATABASE_URL;
  if (!current) return;
  // Only normalize sqlite file: URLs; other providers should remain as-is.
  if (current.trim().startsWith('file:') || current.trim().startsWith('"file:') || current.trim().startsWith("'file:")) {
    process.env.DATABASE_URL = normalizeSqliteDatabaseUrl(current);
  } else {
    process.env.DATABASE_URL = stripWrappingQuotes(current);
  }
}

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) {
    normalizeDatabaseUrl();
    return;
  }

  const cfg = getDatabaseConfig();

  if (cfg.type === 'sqlite') {
    const sqlitePath = cfg.sqlite?.path ?? './data/sso.db';
    process.env.DATABASE_URL = `file:${sqlitePath}`;
    normalizeDatabaseUrl();
    return;
  }

  if (cfg.type === 'postgresql' && cfg.postgresql) {
    process.env.DATABASE_URL = buildPostgresUrl(cfg.postgresql);
    normalizeDatabaseUrl();
    return;
  }

  if ((cfg.type === 'mysql' || cfg.type === 'mariadb') && cfg.mysql) {
    process.env.DATABASE_URL = buildMysqlUrl(cfg.mysql);
    normalizeDatabaseUrl();
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
