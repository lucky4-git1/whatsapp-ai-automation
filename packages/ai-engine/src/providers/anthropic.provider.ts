/**
 * Anthropic (Claude) Provider Implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider } from './provider.interface';
import {
  AIMessage,
  AIResponse,
  ConversationContext,
  AIProviderConfig,
  AIProvider,
  ProviderError,
} from '../types';

export class AnthropicProvider implements IAIProvider {
  private client: Anthropic | null = null;
  private config: AIProviderConfig | null = null;

  async initialize(config: AIProviderConfig): Promise<void> {
    try {
      this.config = config;
      this.client = new Anthropic({
        apiKey: config.apiKey,
        timeout: config.timeout || 30000,
      });

      // Verify connection
      await this.healthCheck();
    } catch (error) {
      throw new ProviderError(
        'Failed to initialize Anthropic provider',
        { originalError: error }
      );
    }
  }

  async generateResponse(
    context: ConversationContext,
    systemPrompt?: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      knowledgeSources?: string[];
    }
  ): Promise<AIResponse> {
    if (!this.client || !this.config) {
      throw new ProviderError('Provider not initialized');
    }

    const startTime = Date.now();

    try {
      // Build system prompt
      const fullSystemPrompt = this.buildSystemPrompt(
        context,
        systemPrompt,
        options?.knowledgeSources
      );

      // Build messages array (Anthropic doesn't use system role in messages)
      const messages: Anthropic.MessageParam[] = [];

      for (const msg of context.history) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      // Call Anthropic API
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-sonnet-20240229',
        system: fullSystemPrompt,
        messages,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 1000,
      });

      const latencyMs = Date.now() - startTime;

      // Extract text from response
      const textContent = response.content.find(
        (block) => block.type === 'text'
      );

      if (!textContent || textContent.type !== 'text') {
        throw new ProviderError('No text content in Anthropic response');
      }

      return {
        message: textContent.text,
        confidence: this.calculateConfidence(response),
        language: context.language,
        usedKnowledgeBase: !!options?.knowledgeSources?.length,
        sources: undefined,
        metadata: {
          tokensUsed:
            (response.usage?.input_tokens || 0) +
            (response.usage?.output_tokens || 0),
          latencyMs,
          provider: AIProvider.ANTHROPIC,
        },
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        'Failed to generate response from Anthropic',
        {
          originalError: error,
          message: error.message,
        }
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Anthropic doesn't provide embedding API
    // Fall back to OpenAI for embeddings or use a separate service
    throw new ProviderError(
      'Anthropic does not support embeddings. Use OpenAI provider for embeddings.'
    );
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Simple API call to verify connection
      // Anthropic doesn't have a dedicated health check endpoint
      // We'll just check if the client is initialized
      return this.client !== null;
    } catch (error) {
      return false;
    }
  }

  getName(): string {
    return 'Anthropic';
  }

  private buildSystemPrompt(
    context: ConversationContext,
    customPrompt?: string,
    knowledgeSources?: string[]
  ): string {
    const languageNames = {
      en: 'English',
      te: 'Telugu',
      hi: 'Hindi',
    };

    const parts: string[] = [];

    // Base system prompt
    parts.push(
      customPrompt ||
        `You are a helpful AI assistant for a WhatsApp-based customer support platform. 
Your role is to provide accurate, helpful, and professional responses to customer inquiries.`
    );

    // Language instruction
    parts.push(
      `\nRespond in ${languageNames[context.language]} language.`
    );

    // Context information
    if (context.metadata?.contactName) {
      parts.push(
        `\nYou are speaking with ${context.metadata.contactName}.`
      );
    }

    // Knowledge base sources
    if (knowledgeSources && knowledgeSources.length > 0) {
      parts.push(
        `\n\nRelevant information from knowledge base:\n${knowledgeSources.join('\n\n')}`
      );
      parts.push(
        `\nUse this information to provide accurate answers. If the knowledge base doesn't contain relevant information, acknowledge that and provide a helpful general response.`
      );
    }

    // Additional guidelines
    parts.push(`\n\nGuidelines:
- Be concise and clear
- Use appropriate tone for customer support
- If you don't know something, admit it honestly
- Provide actionable information when possible
- Maintain context from previous messages in this conversation`);

    return parts.join('');
  }

  private calculateConfidence(
    response: Anthropic.Message
  ): number {
    // Anthropic provides stop_reason
    if (response.stop_reason === 'end_turn') {
      return 0.95; // High confidence for complete responses
    } else if (response.stop_reason === 'max_tokens') {
      return 0.7; // Medium confidence for truncated responses
    }
    return 0.5; // Lower confidence for other cases
  }
}
