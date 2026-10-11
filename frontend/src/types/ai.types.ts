export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contextName?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface ModelInfo {
  name: string;
  size?: string;
  description?: string;
}

export interface ModelsResponse {
  ollama: ModelInfo[];
  mock: ModelInfo[];
  currentModel: string;
}

export interface SendMessagePayload {
  conversationId?: string;
  content: string;
  model?: string;
  provider?: string;
  attachFileId?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: Message;
}
