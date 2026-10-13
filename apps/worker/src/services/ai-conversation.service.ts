/**
 * AI Conversation Service for Worker
 * Integrates AI engine with conversation management for background tasks
 */

import { prisma } from '@whatsapp-automation/database';
import {
  AIEngineService,
  AIProvider,
  SupportedLanguage,
  ConversationContext,
  AIMessage,
  AIResponse,
} from '@whatsapp-ai/ai-engine';
import { ERROR_CODES } from '@whatsapp-automation/shared';
import { logger } from '@whatsapp-automation/observability';

export class AIConversationService {
  private aiEngine: AIEngineService;
  private initialized = false;

  constructor() {
    this.aiEngine = new AIEngineService({
      provider: {
        provider: (process.env.AI_PROVIDER as AIProvider) || AIProvider.OPENAI,
        apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000', 10),
        timeout: 30000,
      },
      knowledgeBase: {
        enabled: process.env.ENABLE_KNOWLEDGE_BASE === 'true',
        pineconeApiKey: process.env.PINECONE_API_KEY,
        pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
        pineconeIndex: process.env.PINECONE_INDEX || 'whatsapp-ai-knowledge',
        similarityThreshold: parseFloat(process.env.KNOWLEDGE_SIMILARITY_THRESHOLD || '0.7'),
        maxResults: parseInt(process.env.KNOWLEDGE_MAX_RESULTS || '5', 10),
      },
      defaultLanguage: SupportedLanguage.ENGLISH,
      conversationHistoryLimit: parseInt(process.env.CONVERSATION_HISTORY_LIMIT || '10', 10),
      enableAutoDetectLanguage: process.env.ENABLE_AUTO_DETECT_LANGUAGE !== 'false',
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.aiEngine.initialize();
      this.initialized = true;
      logger.info({
        provider: this.aiEngine.getProviderName(),
      }, 'AI conversation service initialized in worker');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize AI conversation service in worker');
    }
  }

  async generateResponse(
    workspaceId: string,
    conversationId: string,
    userMessage?: string,
    saveMessage = true
  ): Promise<AIResponse | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.initialized) {
      logger.warn('AI engine not initialized');
      return null;
    }

    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          workspaceId,
          isAiEnabled: true,
        },
        include: {
          contact: {
            include: {
              tags: true,
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 20,
          },
          workspace: {
            select: {
              id: true,
              name: true,
              preferences: true,
            },
          },
        },
      });

      if (!conversation) {
        throw {
          statusCode: 404,
          code: ERROR_CODES.NOT_FOUND,
          message: 'Conversation not found or AI not enabled',
        };
      }

      const context = this.buildConversationContext(conversation, userMessage);
      const customSystemPrompt = this.getWorkspaceSystemPrompt(conversation.workspace);

      const response = await this.aiEngine.generateResponse({
        context,
        useKnowledgeBase: true,
        customSystemPrompt,
      });

      if (saveMessage && response.message) {
        await prisma.message.create({
          data: {
            conversationId,
            content: response.message,
            direction: 'OUTBOUND',
            status: 'PENDING',
            metadata: {
              isAiGenerated: true,
              confidence: response.confidence,
              provider: response.metadata?.provider,
              tokensUsed: response.metadata?.tokensUsed,
              usedKnowledgeBase: response.usedKnowledgeBase,
              sources: response.sources?.map(s => ({
                title: s.title,
                relevance: s.relevanceScore,
              })),
            },
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });
      }

      return response;
    } catch (error: any) {
      logger.error({
        error,
        conversationId,
        workspaceId,
      }, 'Failed to generate AI response');

      if (error.statusCode) {
        throw error;
      }

      throw {
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to generate AI response',
        details: error.message,
      };
    }
  }

  getEngine(): AIEngineService {
    return this.aiEngine;
  }

  private buildConversationContext(
    conversation: any,
    currentMessage?: string
  ): ConversationContext {
    const history: AIMessage[] = [];
    const messages = [...conversation.messages].reverse();
    for (const msg of messages) {
      history.push({
        role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
      });
    }

    if (currentMessage) {
      history.push({
        role: 'user',
        content: currentMessage,
        timestamp: new Date(),
      });
    }

    const lastUserMessage = currentMessage || this.getLastUserMessage(messages);
    let language = SupportedLanguage.ENGLISH;

    if (lastUserMessage) {
      const detection = this.aiEngine.detectLanguage(lastUserMessage);
      if (detection.confidence > 0.7) {
        language = detection.language;
      }
    }

    return {
      conversationId: conversation.id,
      contactId: conversation.contactId,
      workspaceId: conversation.workspaceId,
      language,
      history,
      metadata: {
        contactName: conversation.contact.name || undefined,
        lastInteraction: conversation.lastMessageAt || undefined,
        tags: conversation.contact.tags?.map((t: any) => t.tag.name) || [],
        customFields: conversation.contact.customFields || {},
      },
    };
  }

  private getLastUserMessage(messages: any[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === 'INBOUND') {
        return messages[i].content;
      }
    }
    return null;
  }

  private getWorkspaceSystemPrompt(workspace: any): string | undefined {
    const preferences = workspace.preferences as any;
    return preferences?.aiSystemPrompt || undefined;
  }
}

export const aiConversationService = new AIConversationService();
