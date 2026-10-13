/**
 * AI Engine Package
 * Production-grade AI conversation engine with multi-provider support
 */

// Main service
export { AIEngineService } from './ai-engine.service';

// Providers
export type { IAIProvider } from './providers/provider.interface';
export { OpenAIProvider } from './providers/openai.provider';
export { AnthropicProvider } from './providers/anthropic.provider';

// Knowledge base
export {
  KnowledgeBaseService,
  type UpsertDocumentOptions,
  type SearchOptions,
} from './knowledge/knowledge-base.service';

// Utilities
export { LanguageDetector } from './utils/language-detector';

// Types
export * from './types';
