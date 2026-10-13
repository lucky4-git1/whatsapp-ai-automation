/**
 * AI Conversation Service
 * Integrates AI engine with conversation management
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
    // Initialize AI engine with configuration from environment
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

  /**
   * Initialize AI engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.aiEngine.initialize();
      this.initialized = true;
      logger.info('AI conversation service initialized', {
        provider: this.aiEngine.getProviderName(),
      });
    } catch (error) {
      logger.error('Failed to initialize AI conversation service', { error });
      // Don't throw - allow server to start even if AI is not available
    }
  }

  /**
   * Generate AI response for a conversation
   */
  async generateResponse(
    workspaceId: string,
    conversationId: string,
    userMessage?: string
  ): Promise<AIResponse | null> {
    if (!this.initialized) {
      logger.warn('AI engine not initialized');
      return null;
    }

    try {
      // Get conversation with full context
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          workspaceId,
          isAiEnabled: true, // Only process AI-enabled conversations
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
            take: 20, // Last 20 messages for context
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

      // Build conversation context
      const context = this.buildConversationContext(conversation, userMessage);

      // Get custom system prompt from workspace preferences
      const customSystemPrompt = this.getWorkspaceSystemPrompt(conversation.workspace);

      // Generate AI response
      const response = await this.aiEngine.generateResponse({
        context,
        useKnowledgeBase: true,
        customSystemPrompt,
      });

      // Save AI response as a message
      if (response.message) {
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

        // Update conversation last message time
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });
      }

      return response;
    } catch (error: any) {
      logger.error('Failed to generate AI response', {
        error,
        conversationId,
        workspaceId,
      });

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

  /**
   * Process incoming message with AI if enabled
   */
  async processIncomingMessage(
    conversationId: string,
    messageContent: string
  ): Promise<void> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          workspaceId: true,
          isAiEnabled: true,
          status: true,
        },
      });

      if (!conversation || !conversation.isAiEnabled) {
        return; // AI not enabled for this conversation
      }

      // Don't auto-respond to resolved/archived conversations
      if (conversation.status === 'RESOLVED' || conversation.status === 'ARCHIVED') {
        return;
      }

      // Generate and send AI response
      const response = await this.generateResponse(
        conversation.workspaceId,
        conversationId,
        messageContent
      );

      if (response) {
        logger.info('AI response generated', {
          conversationId,
          confidence: response.confidence,
          usedKnowledgeBase: response.usedKnowledgeBase,
        });
      }
    } catch (error) {
      logger.error('Failed to process incoming message with AI', {
        error,
        conversationId,
      });
      // Don't throw - gracefully degrade
    }
  }

  /**
   * Get AI engine for direct access (e.g., for knowledge base management)
   */
  getEngine(): AIEngineService {
    return this.aiEngine;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    initialized: boolean;
    aiProvider: boolean;
    knowledgeBase: boolean;
    overall: boolean;
  }> {
    if (!this.initialized) {
      return {
        initialized: false,
        aiProvider: false,
        knowledgeBase: false,
        overall: false,
      };
    }

    const health = await this.aiEngine.healthCheck();

    return {
      initialized: true,
      ...health,
    };
  }

  // Private helper methods

  private buildConversationContext(
    conversation: any,
    currentMessage?: string
  ): ConversationContext {
    // Build message history
    const history: AIMessage[] = [];

    // Add previous messages (reverse to get chronological order)
    const messages = [...conversation.messages].reverse();
    for (const msg of messages) {
      history.push({
        role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
      });
    }

    // Add current message if provided
    if (currentMessage) {
      history.push({
        role: 'user',
        content: currentMessage,
        timestamp: new Date(),
      });
    }

    // Detect language from most recent message
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
    // Check if workspace has custom AI prompt in preferences
    const preferences = workspace.preferences as any;
    return preferences?.aiSystemPrompt || undefined;
  }
}

// Export singleton instance
export const aiConversationService = new AIConversationService();
