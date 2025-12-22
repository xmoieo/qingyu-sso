/**
 * 数据库配置
 */

export type DatabaseType = 'sqlite' | 'mysql' | 'mariadb' | 'postgresql';

export interface DatabaseConfig {
  type: DatabaseType;
  sqlite?: {
    path: string;
  };
  mysql?: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  postgresql?: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const type = (process.env.DB_TYPE || 'sqlite') as DatabaseType;

  const config: DatabaseConfig = { type };

  switch (type) {
    case 'sqlite':
      config.sqlite = {
        path: process.env.SQLITE_PATH || './data/sso.db',
      };
      break;
    case 'mysql':
    case 'mariadb':
      config.mysql = {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'sso',
      };
      break;
    case 'postgresql':
      config.postgresql = {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        database: process.env.POSTGRES_DATABASE || 'sso',
      };
      break;
  }

  return config;
}
