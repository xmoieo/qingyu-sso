/**
 * 系统设置服务
 */
import { getDatabase } from '../db';

export interface SystemSettings {
  allowRegistration: boolean;
  avatarProvider: 'gravatar' | 'cravatar';
}

export const settingsService = {
  // 获取设置
  get(key: string): string | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value || null;
  },

  // 设置值
  set(key: string, value: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
    `);
    stmt.run(key, value, value);
  },

  // 获取所有设置
  getAll(): SystemSettings {
    return {
      allowRegistration: this.get('allow_registration') !== 'false',
      avatarProvider: (this.get('avatar_provider') as 'gravatar' | 'cravatar') || 'gravatar',
    };
  },

  // 更新多个设置
  updateAll(settings: Partial<SystemSettings>): void {
    if (settings.allowRegistration !== undefined) {
      this.set('allow_registration', settings.allowRegistration ? 'true' : 'false');
    }
    if (settings.avatarProvider !== undefined) {
      this.set('avatar_provider', settings.avatarProvider);
    }
  },

  // 检查是否允许注册
  isRegistrationAllowed(): boolean {
    return this.get('allow_registration') !== 'false';
  },
};
