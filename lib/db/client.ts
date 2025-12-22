/**
 * Unified DB client used by services.
 *
 * - SQLite is synchronous internally (better-sqlite3) but exposed as async.
 * - PostgreSQL is async (node-postgres).
 *
 * We keep SQL written with SQLite-style '?' placeholders and translate them for PostgreSQL.
 */

export type DbDialect = 'sqlite' | 'postgresql';

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  dialect: DbDialect;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<number>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function isEscaped(sql: string, index: number): boolean {
  // Count preceding backslashes
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && sql[i] === '\\'; i--) backslashes++;
  return backslashes % 2 === 1;
}

export function toPostgresSql(sql: string): { sql: string; paramsCount: number } {
  // Translate SQLite datetime helper
  const transformed = sql.replace(/datetime\('now'\)/g, 'NOW()');

  // Translate '?' placeholders to '$1, $2, ...' (best-effort, ignoring quoted strings)
  let inSingle = false;
  let inDouble = false;
  let paramIndex = 0;
  let out = '';

  for (let i = 0; i < transformed.length; i++) {
    const ch = transformed[i];

    if (ch === "'" && !inDouble && !isEscaped(transformed, i)) {
      inSingle = !inSingle;
      out += ch;
      continue;
    }

    if (ch === '"' && !inSingle && !isEscaped(transformed, i)) {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    if (ch === '?' && !inSingle && !inDouble) {
      paramIndex += 1;
      out += `$${paramIndex}`;
      continue;
    }

    out += ch;
  }

  return { sql: out, paramsCount: paramIndex };
}

export function toSqliteSql(sql: string): string {
  return sql;
}

export function numberFromCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value, 10);
  return Number(value);
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
