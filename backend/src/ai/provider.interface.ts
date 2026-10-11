export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  systemPrompt?: string;
}

export interface AIProvider {
  name: string;
  listModels(baseUrl?: string): Promise<string[]>;
  chat(options: ChatCompletionOptions, baseUrl?: string): Promise<string>;
}
