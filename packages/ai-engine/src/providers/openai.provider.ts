/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai';
import { IAIProvider } from './provider.interface';
import {
  AIMessage,
  AIResponse,
  ConversationContext,
  AIProviderConfig,
  AIProvider,
  ProviderError,
} from '../types';

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI | null = null;
  private config: AIProviderConfig | null = null;

  async initialize(config: AIProviderConfig): Promise<void> {
    try {
      this.config = config;
      this.client = new OpenAI({
        apiKey: config.apiKey,
        timeout: config.timeout || 30000,
      });

      // Verify connection
      await this.healthCheck();
    } catch (error) {
      throw new ProviderError(
        'Failed to initialize OpenAI provider',
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
      // Build messages array
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Add system prompt
      const fullSystemPrompt = this.buildSystemPrompt(
        context,
        systemPrompt,
        options?.knowledgeSources
      );
      messages.push({
        role: 'system',
        content: fullSystemPrompt,
      });

      // Add conversation history
      for (const msg of context.history) {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        });
      }

      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 1000,
      });

      const latencyMs = Date.now() - startTime;
      const choice = response.choices[0];

      if (!choice?.message?.content) {
        throw new ProviderError('Empty response from OpenAI');
      }

      return {
        message: choice.message.content,
        confidence: this.calculateConfidence(choice),
        language: context.language,
        usedKnowledgeBase: !!options?.knowledgeSources?.length,
        sources: undefined, // Sources handled by knowledge base service
        metadata: {
          tokensUsed: response.usage?.total_tokens,
          latencyMs,
          provider: AIProvider.OPENAI,
        },
      };
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        'Failed to generate response from OpenAI',
        {
          originalError: error,
          message: error.message,
          code: error.code,
        }
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new ProviderError('Provider not initialized');
    }

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      throw new ProviderError(
        'Failed to generate embedding',
        { originalError: error }
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Simple API call to verify connection
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  getName(): string {
    return 'OpenAI';
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
    choice: OpenAI.Chat.Completions.ChatCompletion.Choice
  ): number {
    // OpenAI doesn't provide confidence scores directly
    // We use finish_reason as a proxy
    if (choice.finish_reason === 'stop') {
      return 0.95; // High confidence for complete responses
    } else if (choice.finish_reason === 'length') {
      return 0.7; // Medium confidence for truncated responses
    }
    return 0.5; // Lower confidence for other cases
  }
}
