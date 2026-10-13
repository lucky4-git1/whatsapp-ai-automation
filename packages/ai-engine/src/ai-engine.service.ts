/**
 * AI Engine Service
 * Main orchestrator for AI-powered conversations
 */

import { IAIProvider } from './providers/provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { KnowledgeBaseService } from './knowledge/knowledge-base.service';
import { LanguageDetector } from './utils/language-detector';
import {
  AIEngineConfig,
  AIProvider,
  AIResponse,
  GenerateResponseOptions,
  ConversationContext,
  SupportedLanguage,
  AIEngineError,
  KnowledgeSource,
} from './types';

export class AIEngineService {
  private provider: IAIProvider;
  private knowledgeBase: KnowledgeBaseService;
  private config: AIEngineConfig;
  private initialized = false;

  constructor(config: AIEngineConfig) {
    this.config = config;

    // Initialize AI provider
    this.provider = this.createProvider(config.provider.provider);

    // Initialize knowledge base service
    this.knowledgeBase = new KnowledgeBaseService(
      config.knowledgeBase,
      this.provider
    );
  }

  /**
   * Initialize the AI engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize AI provider
      await this.provider.initialize(this.config.provider);

      // Initialize knowledge base
      if (this.config.knowledgeBase.enabled) {
        await this.knowledgeBase.initialize();
      }

      this.initialized = true;
    } catch (error) {
      throw new AIEngineError(
        'Failed to initialize AI engine',
        'INITIALIZATION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Generate AI response for a conversation
   */
  async generateResponse(
    options: GenerateResponseOptions
  ): Promise<AIResponse> {
    if (!this.initialized) {
      throw new AIEngineError(
        'AI engine not initialized',
        'NOT_INITIALIZED'
      );
    }

    try {
      let context = options.context;

      // Auto-detect language if enabled
      if (this.config.enableAutoDetectLanguage) {
        const lastUserMessage = this.getLastUserMessage(context);
        if (lastUserMessage) {
          const detection = LanguageDetector.detect(
            lastUserMessage.content
          );
          if (detection.confidence > 0.7) {
            context = {
              ...context,
              language: detection.language,
            };
          }
        }
      }

      // Limit conversation history
      if (this.config.conversationHistoryLimit) {
        context = this.limitHistory(
          context,
          this.config.conversationHistoryLimit
        );
      }

      // Search knowledge base if enabled
      let knowledgeSources: KnowledgeSource[] = [];
      let knowledgeSourceTexts: string[] = [];

      if (
        options.useKnowledgeBase &&
        this.config.knowledgeBase.enabled
      ) {
        const lastUserMessage = this.getLastUserMessage(context);
        if (lastUserMessage) {
          knowledgeSources = await this.knowledgeBase.search({
            workspaceId: context.workspaceId,
            query: lastUserMessage.content,
            language: context.language,
          });

          knowledgeSourceTexts = knowledgeSources.map(
            (source) =>
              `[${source.title}] (Relevance: ${(source.relevanceScore * 100).toFixed(0)}%)\n${source.content}`
          );
        }
      }

      // Generate response from AI provider
      const response = await this.provider.generateResponse(
        context,
        options.customSystemPrompt,
        {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          knowledgeSources: knowledgeSourceTexts,
        }
      );

      // Add knowledge sources to response
      if (knowledgeSources.length > 0) {
        response.sources = knowledgeSources;
        response.usedKnowledgeBase = true;
      }

      return response;
    } catch (error) {
      if (error instanceof AIEngineError) {
        throw error;
      }

      throw new AIEngineError(
        'Failed to generate response',
        'GENERATION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get knowledge base service for direct access
   */
  getKnowledgeBase(): KnowledgeBaseService {
    return this.knowledgeBase;
  }

  /**
   * Detect language from text
   */
  detectLanguage(text: string): {
    language: SupportedLanguage;
    confidence: number;
  } {
    return LanguageDetector.detect(text);
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    aiProvider: boolean;
    knowledgeBase: boolean;
    overall: boolean;
  }> {
    const aiProviderHealthy = await this.provider.healthCheck();
    const knowledgeBaseHealthy =
      await this.knowledgeBase.healthCheck();

    return {
      aiProvider: aiProviderHealthy,
      knowledgeBase: knowledgeBaseHealthy,
      overall: aiProviderHealthy && knowledgeBaseHealthy,
    };
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.getName();
  }

  // Private helper methods

  private createProvider(providerType: AIProvider): IAIProvider {
    switch (providerType) {
      case AIProvider.OPENAI:
        return new OpenAIProvider();
      case AIProvider.ANTHROPIC:
        return new AnthropicProvider();
      default:
        throw new AIEngineError(
          `Unknown provider: ${providerType}`,
          'INVALID_PROVIDER'
        );
    }
  }

  private getLastUserMessage(
    context: ConversationContext
  ): { role: string; content: string } | null {
    for (let i = context.history.length - 1; i >= 0; i--) {
      if (context.history[i].role === 'user') {
        return context.history[i];
      }
    }
    return null;
  }

  private limitHistory(
    context: ConversationContext,
    limit: number
  ): ConversationContext {
    if (context.history.length <= limit) {
      return context;
    }

    // Keep the most recent messages
    return {
      ...context,
      history: context.history.slice(-limit),
    };
  }
}
