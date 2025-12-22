/**
 * 数据库模块导出
 */
export * from './types';
export * from './config';

import { getDatabaseConfig } from './config';
import type { DbClient } from './client';
import { getPostgresDatabase } from './postgresql';
import { getDatabase as getSqliteDatabase, closeDatabase as closeSqliteDatabase } from './sqlite';

let cached: DbClient | null = null;

export async function getDatabase(): Promise<DbClient> {
	if (cached) return cached;
	const config = getDatabaseConfig();

	if (config.type === 'postgresql') {
		cached = await getPostgresDatabase();
		return cached;
	}

	// Default to sqlite for now.
	cached = getSqliteDatabase();
	return cached;
}

export async function closeDatabase(): Promise<void> {
	if (!cached) return;
	if (cached.dialect === 'postgresql') {
		await cached.close();
		cached = null;
		return;
	}

	closeSqliteDatabase();
	cached = null;
}
