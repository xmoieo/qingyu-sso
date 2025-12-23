/**
 * 数据库模块导出
 */
export * from './types';
export * from './config';

// NOTE: 旧的 getDatabase()/closeDatabase() 已移除。
// 现在项目统一通过 Prisma Client（见 lib/prisma.ts）访问数据库。
