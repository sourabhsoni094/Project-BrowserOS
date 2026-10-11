import { api } from './api';
import { vfsService } from './vfs.service';
import { TerminalExecutionResponse } from '../types/terminal.types';

export const terminalService = {
  async execute(command: string, cwdId?: string | null): Promise<TerminalExecutionResponse> {
    const res = await api.post<{ success: boolean; data: TerminalExecutionResponse }>(
      '/terminal/execute',
      {
        command,
        cwdId: cwdId || null,
      }
    );
    return res.data;
  },

  async getCompletionSuggestions(cwdId: string | null, prefix: string): Promise<string[]> {
    try {
      const data = await vfsService.listDirectory(cwdId);
      const matches = data.items
        .filter((item) => item.name.toLowerCase().startsWith(prefix.toLowerCase()))
        .map((item) => (item.type === 'FOLDER' ? `${item.name}/` : item.name));
      return matches;
    } catch {
      return [];
    }
  },
};
