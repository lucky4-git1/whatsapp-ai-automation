/**
 * Core AI Engine Types
 */

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export enum SupportedLanguage {
  ENGLISH = 'en',
  TELUGU = 'te',
  HINDI = 'hi',
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  conversationId: string;
  contactId: string;
  workspaceId: string;
  language: SupportedLanguage;
  history: AIMessage[];
  metadata?: {
    contactName?: string;
    lastInteraction?: Date;
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

export interface AIResponse {
  message: string;
  confidence: number;
  language: SupportedLanguage;
  usedKnowledgeBase: boolean;
  sources?: KnowledgeSource[];
  metadata?: {
    tokensUsed?: number;
    latencyMs?: number;
    provider?: AIProvider;
  };
}

export interface KnowledgeSource {
  id: string;
  content: string;
  title: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeDocument {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  language: SupportedLanguage;
  tags: string[];
  metadata?: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface KnowledgeBaseConfig {
  enabled: boolean;
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndex?: string;
  similarityThreshold?: number;
  maxResults?: number;
}

export interface AIEngineConfig {
  provider: AIProviderConfig;
  knowledgeBase: KnowledgeBaseConfig;
  defaultLanguage: SupportedLanguage;
  conversationHistoryLimit?: number;
  enableAutoDetectLanguage?: boolean;
}

export interface GenerateResponseOptions {
  context: ConversationContext;
  useKnowledgeBase?: boolean;
  customSystemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
}

// Error types
export class AIEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AIEngineError';
  }
}

export class ProviderError extends AIEngineError {
  constructor(message: string, details?: any) {
    super(message, 'PROVIDER_ERROR', details);
    this.name = 'ProviderError';
  }
}

export class KnowledgeBaseError extends AIEngineError {
  constructor(message: string, details?: any) {
    super(message, 'KNOWLEDGE_BASE_ERROR', details);
    this.name = 'KnowledgeBaseError';
  }
}
