import { api } from './api';
import { UserPreferences, UpdatePreferencesPayload } from '../types/settings.types';

export const settingsService = {
  getPreferences: async (): Promise<UserPreferences> => {
    const data = await api.get<{ preferences: UserPreferences }>('/settings');
    return data.preferences;
  },

  updatePreferences: async (payload: UpdatePreferencesPayload): Promise<UserPreferences> => {
    const data = await api.patch<{ preferences: UserPreferences; message: string }>('/settings', payload);
    return data.preferences;
  },
};
