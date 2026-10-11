export interface UserPreferences {
  id: string;
  userId: string;
  theme: string;
  wallpaper: string;
  fontSize: number;
  ollamaUrl: string;
  aiModel: string;
  terminalFontSize: number;
  updatedAt: string;
}

export interface UpdatePreferencesPayload {
  theme?: string;
  wallpaper?: string;
  fontSize?: number;
  ollamaUrl?: string;
  aiModel?: string;
  terminalFontSize?: number;
}
