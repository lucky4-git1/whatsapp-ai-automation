/**
 * AI Provider Interface
 * Abstraction for different AI providers (OpenAI, Anthropic, etc.)
 */

import { AIMessage, AIResponse, ConversationContext, AIProviderConfig } from '../types';

export interface IAIProvider {
  /**
   * Initialize the provider with configuration
   */
  initialize(config: AIProviderConfig): Promise<void>;

  /**
   * Generate a response based on conversation context
   */
  generateResponse(
    context: ConversationContext,
    systemPrompt?: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      knowledgeSources?: string[];
    }
  ): Promise<AIResponse>;

  /**
   * Generate embeddings for text (for knowledge base)
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Check if provider is healthy and accessible
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get provider name
   */
  getName(): string;
}
