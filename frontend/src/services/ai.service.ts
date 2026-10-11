import { api } from './api';
import { Conversation, ModelsResponse, SendMessagePayload, ChatResponse } from '../types/ai.types';

export const aiService = {
  listConversations: async (): Promise<Conversation[]> => {
    const data = await api.get<{ conversations: Conversation[] }>('/ai/conversations');
    return data.conversations;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const data = await api.get<{ conversation: Conversation }>(`/ai/conversations/${id}`);
    return data.conversation;
  },

  createConversation: async (title?: string, model?: string, provider?: string): Promise<Conversation> => {
    const data = await api.post<{ conversation: Conversation }>('/ai/conversations', {
      title,
      model,
      provider,
    });
    return data.conversation;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/ai/conversations/${id}`);
  },

  listModels: async (): Promise<ModelsResponse> => {
    return api.get<ModelsResponse>('/ai/models');
  },

  sendMessage: async (payload: SendMessagePayload): Promise<ChatResponse> => {
    return api.post<ChatResponse>('/ai/chat', payload);
  },
};
