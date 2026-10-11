import { prisma } from '../config/db.js';
import { ollamaProvider } from '../ai/ollama.provider.js';
import { mockProvider } from '../ai/mock.provider.js';
import { AIProvider } from '../ai/provider.interface.js';
import { vfsService } from './vfs.service.js';
import { AppError } from '../middleware/error.middleware.js';

export interface SendMessageDTO {
  conversationId?: string;
  content: string;
  model?: string;
  provider?: string;
  attachFileId?: string; // Explicitly permitted file context
}

export class AIService {
  private getProvider(providerName: string): AIProvider {
    switch (providerName.toLowerCase()) {
      case 'ollama':
        return ollamaProvider;
      case 'mock':
      default:
        return mockProvider;
    }
  }

  async listConversations(userId: string) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!convo) throw new AppError('Conversation not found', 404);
    return convo;
  }

  async createConversation(userId: string, title?: string, model = 'llama3', provider = 'ollama') {
    return prisma.conversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
        model,
        provider,
      },
    });
  }

  async deleteConversation(userId: string, conversationId: string) {
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!convo) throw new AppError('Conversation not found', 404);

    return prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  async listModels(userId: string) {
    const prefs = await prisma.userPreference.findUnique({ where: { userId } });
    const ollamaUrl = prefs?.ollamaUrl || 'http://localhost:11434';

    const rawOllama = await ollamaProvider.listModels(ollamaUrl);
    const rawMock = await mockProvider.listModels();

    const ollamaModels = rawOllama.map((name) => ({
      name,
      description: 'Local Ollama Model',
    }));

    const mockModels = rawMock.map((name) => ({
      name,
      description: 'BrowserOS Offline AI',
    }));

    const isOllamaAvailable = ollamaModels.length > 0;
    const defaultModel = isOllamaAvailable ? ollamaModels[0].name : 'browseros-assistant-v1';

    return {
      ollama: ollamaModels,
      mock: mockModels,
      currentModel: isOllamaAvailable ? (prefs?.aiModel || defaultModel) : defaultModel,
    };
  }

  async chat(userId: string, dto: SendMessageDTO) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
    if (!user) throw new AppError('User not found', 404);

    const isMock =
      dto.provider === 'mock' ||
      dto.model === 'browseros-assistant-v1' ||
      dto.model === 'code-helper-fast';

    const providerToUse = isMock ? 'mock' : (dto.provider || 'ollama');
    const modelToUse = dto.model || (isMock ? 'browseros-assistant-v1' : (user.preferences?.aiModel || 'llama3'));

    let conversation;
    if (dto.conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: dto.conversationId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conversation) throw new AppError('Conversation not found', 404);
    } else {
      // Auto-title from the first user message
      const title = dto.content.slice(0, 35) + (dto.content.length > 35 ? '...' : '');
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title,
          model: modelToUse,
          provider: providerToUse,
        },
        include: { messages: true },
      });
    }

    // Handle explicitly attached virtual file context
    let promptWithContext = dto.content;
    let attachedFileName: string | null = null;

    if (dto.attachFileId) {
      try {
        const fileNode = await vfsService.getNodeById(userId, dto.attachFileId);
        if (fileNode.type === 'FILE') {
          attachedFileName = fileNode.name;
          promptWithContext = `[Context File: "${fileNode.name}"]\n\`\`\`\n${fileNode.content || ''}\n\`\`\`\n\nUser Question:\n${dto.content}`;
        }
      } catch (err) {
        console.warn('Could not attach requested context file:', err);
      }
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: dto.content,
        contextName: attachedFileName,
      },
    });

    // Build chat history for LLM
    const previousMessages = conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
    previousMessages.push({ role: 'user', content: promptWithContext });

    const activeProvider = this.getProvider(providerToUse);
    const baseUrl = user.preferences?.ollamaUrl || 'http://localhost:11434';

    let assistantResponseText = '';

    try {
      assistantResponseText = await activeProvider.chat(
        {
          model: modelToUse,
          messages: previousMessages,
          systemPrompt:
            'You are BrowserOS AI, a helpful, intelligent coding assistant and desktop companion embedded in BrowserOS. Assist users with code, terminal commands, and system navigation. Format answers with clear Markdown and syntax-highlighted code blocks.',
        },
        baseUrl
      );
    } catch (llmError: any) {
      // If Ollama fails, fall back to offline assistant
      console.warn('[AI Service] Provider failed, attempting fallback:', llmError.message);
      assistantResponseText = await mockProvider.chat({
        model: 'browseros-assistant-v1',
        messages: previousMessages,
      });
      assistantResponseText = `> *Notice: Local Ollama runtime was unreachable (${llmError.message}). Operating in BrowserOS offline companion mode.*\n\n${assistantResponseText}`;
    }

    // Save assistant response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantResponseText,
      },
    });

    // Touch conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
    };
  }
}

export const aiService = new AIService();
