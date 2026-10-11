import { prisma } from '../config/db.js';

export interface UpdatePreferencesDTO {
  theme?: string;
  wallpaper?: string;
  fontSize?: number;
  ollamaUrl?: string;
  aiModel?: string;
  terminalFontSize?: number;
}

export class SettingsService {
  async getPreferences(userId: string) {
    let prefs = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await prisma.userPreference.create({
        data: {
          userId,
          theme: 'dark',
          wallpaper: 'default-wallpaper',
          fontSize: 14,
          ollamaUrl: 'http://localhost:11434',
          aiModel: 'llama3',
          terminalFontSize: 13,
        },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDTO) {
    return prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        theme: dto.theme || 'dark',
        wallpaper: dto.wallpaper || 'default-wallpaper',
        fontSize: dto.fontSize || 14,
        ollamaUrl: dto.ollamaUrl || 'http://localhost:11434',
        aiModel: dto.aiModel || 'llama3',
        terminalFontSize: dto.terminalFontSize || 13,
      },
      update: {
        ...(dto.theme !== undefined && { theme: dto.theme }),
        ...(dto.wallpaper !== undefined && { wallpaper: dto.wallpaper }),
        ...(dto.fontSize !== undefined && { fontSize: dto.fontSize }),
        ...(dto.ollamaUrl !== undefined && { ollamaUrl: dto.ollamaUrl }),
        ...(dto.aiModel !== undefined && { aiModel: dto.aiModel }),
        ...(dto.terminalFontSize !== undefined && { terminalFontSize: dto.terminalFontSize }),
      },
    });
  }
}

export const settingsService = new SettingsService();
