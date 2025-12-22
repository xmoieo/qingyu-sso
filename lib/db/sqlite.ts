/**
 * SQLite数据库连接和初始化
 */
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getDatabaseConfig } from './config';

import type { DbClient, QueryResult } from './client';

let rawDb: Database.Database | null = null;
let client: DbClient | null = null;

function toQueryResult<T>(rows: T[], rowCount?: number): QueryResult<T> {
  return { rows, rowCount: rowCount ?? rows.length };
}

export function getDatabase(): DbClient {
  if (client) return client;

  const config = getDatabaseConfig();

  if (config.type !== 'sqlite' || !config.sqlite) {
    throw new Error('当前仅支持SQLite数据库');
  }

  const dbPath = config.sqlite.path;
  const dir = dirname(dbPath);

  // 确保数据目录存在
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');

  // 初始化表结构
  initTables(rawDb);

  client = {
    dialect: 'sqlite',
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      if (!rawDb) throw new Error('SQLite not initialized');
      const stmt = rawDb.prepare(sql);
      const rows = stmt.all(...params) as T[];
      return toQueryResult(rows);
    },
    async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      if (!rawDb) throw new Error('SQLite not initialized');
      const stmt = rawDb.prepare(sql);
      const row = stmt.get(...params) as T | undefined;
      return row ?? null;
    },
    async execute(sql: string, params: unknown[] = []) {
      if (!rawDb) throw new Error('SQLite not initialized');
      const stmt = rawDb.prepare(sql);
      const result = stmt.run(...params);
      return result.changes;
    },
    async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
      if (!rawDb) throw new Error('SQLite not initialized');
      rawDb.exec('BEGIN');
      try {
        const result = await fn(this);
        rawDb.exec('COMMIT');
        return result;
      } catch (err) {
        rawDb.exec('ROLLBACK');
        throw err;
      }
    },
    async close() {
      closeDatabase();
    },
  };

  return client;
}

function initTables(db: Database.Database): void {
  // 系统设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 初始化默认设置
  db.exec(`
    INSERT OR IGNORE INTO system_settings (key, value) VALUES 
    ('allow_registration', 'true'),
    ('avatar_provider', 'gravatar')
  `);

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      gender TEXT,
      birthday TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 尝试添加新字段（如果不存在）
  try {
    db.exec(`ALTER TABLE users ADD COLUMN gender TEXT`);
  } catch { /* 字段已存在 */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN birthday TEXT`);
  } catch { /* 字段已存在 */ }

  // 应用程序表
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL,
      client_secret TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      redirect_uris TEXT NOT NULL,
      scopes TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 应用程序访问权限表
  db.exec(`
    CREATE TABLE IF NOT EXISTS application_permissions (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'view',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(application_id, user_id)
    )
  `);

  // 授权登录日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES applications(client_id)
    )
  `);

  // 授权码表
  db.exec(`
    CREATE TABLE IF NOT EXISTS authorization_codes (
      code TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      scope TEXT,
      code_challenge TEXT,
      code_challenge_method TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES applications(client_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 访问令牌表
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      client_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      scope TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES applications(client_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 刷新令牌表
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      access_token_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (access_token_id) REFERENCES access_tokens(id)
    )
  `);

  // 用户会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 用户授权同意记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES applications(client_id),
      UNIQUE(user_id, client_id)
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_applications_client_id ON applications(client_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_logs_client_id ON auth_logs(client_id);
    CREATE INDEX IF NOT EXISTS idx_app_permissions_app_id ON application_permissions(application_id);
    CREATE INDEX IF NOT EXISTS idx_app_permissions_user_id ON application_permissions(user_id);
  `);
}

export function closeDatabase(): void {
  if (rawDb) {
    rawDb.close();
    rawDb = null;
  }
  client = null;
}
