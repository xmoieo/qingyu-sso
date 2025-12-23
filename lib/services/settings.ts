/**
 * 系统设置服务
 */
import { prisma } from '../prisma';

export interface SystemSettings {
  allowRegistration: boolean;
  avatarProvider: 'gravatar' | 'cravatar';
  logoUrl: string;
  copyrightHtml: string;
}

export const settingsService = {
  // 获取设置
  async get(key: string): Promise<string | null> {
    const row = await prisma().systemSetting.findUnique({ where: { key }, select: { value: true } });
    return row?.value ?? null;
  },

  // 设置值
  async set(key: string, value: string): Promise<void> {
    await prisma().systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  },

  // 获取所有设置
  async getAll(): Promise<SystemSettings> {
    return {
      allowRegistration: (await this.get('allow_registration')) !== 'false',
      avatarProvider: ((await this.get('avatar_provider')) as 'gravatar' | 'cravatar') || 'gravatar',
      logoUrl: (await this.get('logo_url')) ?? '',
      copyrightHtml: (await this.get('copyright_html')) ?? '',
    };
  },

  // 更新多个设置
  async updateAll(settings: Partial<SystemSettings>): Promise<void> {
    if (settings.allowRegistration !== undefined) {
      await this.set('allow_registration', settings.allowRegistration ? 'true' : 'false');
    }
    if (settings.avatarProvider !== undefined) {
      await this.set('avatar_provider', settings.avatarProvider);
    }
    if (settings.logoUrl !== undefined) {
      await this.set('logo_url', settings.logoUrl);
    }
    if (settings.copyrightHtml !== undefined) {
      await this.set('copyright_html', settings.copyrightHtml);
    }
  },

  // 检查是否允许注册
  async isRegistrationAllowed(): Promise<boolean> {
    return (await this.get('allow_registration')) !== 'false';
  },
};
