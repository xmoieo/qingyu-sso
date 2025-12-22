/**
 * PostgreSQL database connection and initialization.
 */

import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import { DbClient, QueryResult, toPostgresSql } from './client';
import { getDatabaseConfig } from './config';

let pool: Pool | null = null;
let client: DbClient | null = null;

function createPool(): Pool {
  const config = getDatabaseConfig();
  if (config.type !== 'postgresql' || !config.postgresql) {
    throw new Error('PostgreSQL config missing');
  }

  return new Pool({
    host: config.postgresql.host,
    port: config.postgresql.port,
    user: config.postgresql.user,
    password: config.postgresql.password,
    database: config.postgresql.database,
    max: 10,
  });
}

async function pgQuery<T>(pg: Pool | PoolClient, sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
  const converted = toPostgresSql(sql);
  const res = (await pg.query(converted.sql, params)) as PgQueryResult;
  return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
}

async function initTables(pg: Pool): Promise<void> {
  // Tables
  await pg.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('allow_registration', 'true'),
      ('avatar_provider', 'gravatar'),
      ('logo_url', ''),
      ('copyright_html', '')
    ON CONFLICT (key) DO NOTHING
  `);

  await pg.query(`
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL,
      client_secret TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      redirect_uris TEXT NOT NULL,
      scopes TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS application_permissions (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      permission TEXT NOT NULL DEFAULT 'view',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(application_id, user_id)
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS auth_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      client_id TEXT NOT NULL REFERENCES applications(client_id),
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS authorization_codes (
      code TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES applications(client_id),
      user_id TEXT NOT NULL REFERENCES users(id),
      redirect_uri TEXT NOT NULL,
      scope TEXT,
      code_challenge TEXT,
      code_challenge_method TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS access_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      client_id TEXT NOT NULL REFERENCES applications(client_id),
      user_id TEXT NOT NULL REFERENCES users(id),
      scope TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      access_token_id TEXT NOT NULL REFERENCES access_tokens(id),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS user_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      client_id TEXT NOT NULL REFERENCES applications(client_id),
      scope TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, client_id)
    )
  `);

  // Indexes
  await pg.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_applications_client_id ON applications(client_id)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_auth_logs_client_id ON auth_logs(client_id)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_app_permissions_app_id ON application_permissions(application_id)');
  await pg.query('CREATE INDEX IF NOT EXISTS idx_app_permissions_user_id ON application_permissions(user_id)');
}

export async function getPostgresDatabase(): Promise<DbClient> {
  if (client) return client;

  if (!pool) {
    pool = createPool();
    await initTables(pool);
  }

  client = {
    dialect: 'postgresql',

    async query<T>(sql: string, params: unknown[] = []) {
      if (!pool) throw new Error('PostgreSQL pool not initialized');
      return pgQuery<T>(pool, sql, params);
    },

    async queryOne<T>(sql: string, params: unknown[] = []) {
      const res = await this.query<T>(sql, params);
      return res.rows[0] ?? null;
    },

    async execute(sql: string, params: unknown[] = []) {
      const res = await this.query(sql, params);
      return res.rowCount;
    },

    async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
      if (!pool) throw new Error('PostgreSQL pool not initialized');
      const pgClient = await pool.connect();
      try {
        await pgClient.query('BEGIN');
        const tx: DbClient = {
          dialect: 'postgresql',
          async query<R>(sql: string, params: unknown[] = []) {
            return pgQuery<R>(pgClient, sql, params);
          },
          async queryOne<R>(sql: string, params: unknown[] = []) {
            const res = await this.query<R>(sql, params);
            return res.rows[0] ?? null;
          },
          async execute(sql: string, params: unknown[] = []) {
            const res = await this.query(sql, params);
            return res.rowCount;
          },
          async transaction() {
            // Nested transactions would need SAVEPOINT; keep it simple.
            throw new Error('Nested transactions are not supported');
          },
          async close() {
            // no-op for tx client
          },
        };

        const result = await fn(tx);
        await pgClient.query('COMMIT');
        return result;
      } catch (err) {
        await pgClient.query('ROLLBACK');
        throw err;
      } finally {
        pgClient.release();
      }
    },

    async close() {
      if (pool) {
        await pool.end();
        pool = null;
        client = null;
      }
    },
  };

  return client;
}
