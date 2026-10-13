# @whatsapp-ai/ai-engine

Production-grade AI conversation engine with multi-provider support, knowledge base integration, and multilingual capabilities.

## Features

- **Multi-Provider Support**: OpenAI (GPT-4) and Anthropic (Claude) with easy provider switching
- **Knowledge Base**: Vector-based semantic search using Pinecone for context-aware responses
- **Multilingual**: Support for English, Telugu, and Hindi with automatic language detection
- **Context Management**: Maintains conversation history and context
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @whatsapp-ai/ai-engine
```

## Quick Start

```typescript
import { AIEngineService, AIProvider, SupportedLanguage } from '@whatsapp-ai/ai-engine';

// Initialize AI engine
const aiEngine = new AIEngineService({
  provider: {
    provider: AIProvider.OPENAI,
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 1000,
  },
  knowledgeBase: {
    enabled: true,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
    pineconeIndex: 'whatsapp-ai-knowledge',
    similarityThreshold: 0.7,
    maxResults: 5,
  },
  defaultLanguage: SupportedLanguage.ENGLISH,
  conversationHistoryLimit: 10,
  enableAutoDetectLanguage: true,
});

await aiEngine.initialize();

// Generate a response
const response = await aiEngine.generateResponse({
  context: {
    conversationId: 'conv-123',
    contactId: 'contact-456',
    workspaceId: 'workspace-789',
    language: SupportedLanguage.ENGLISH,
    history: [
      {
        role: 'user',
        content: 'What are your business hours?',
        timestamp: new Date(),
      },
    ],
    metadata: {
      contactName: 'John Doe',
    },
  },
  useKnowledgeBase: true,
});

console.log(response.message);
console.log(`Confidence: ${response.confidence}`);
console.log(`Used knowledge base: ${response.usedKnowledgeBase}`);
```

## Knowledge Base

### Adding Documents

```typescript
const knowledgeBase = aiEngine.getKnowledgeBase();

await knowledgeBase.upsertDocument({
  workspaceId: 'workspace-789',
  title: 'Business Hours',
  content: 'We are open Monday to Friday, 9 AM to 6 PM IST.',
  language: SupportedLanguage.ENGLISH,
  tags: ['hours', 'info'],
});
```

### Searching Documents

```typescript
const results = await knowledgeBase.search({
  workspaceId: 'workspace-789',
  query: 'What time do you open?',
  language: SupportedLanguage.ENGLISH,
  limit: 5,
  similarityThreshold: 0.7,
});

console.log(results); // Returns relevant documents with relevance scores
```

## Language Detection

```typescript
const detection = aiEngine.detectLanguage('నమస్కారం');
console.log(detection.language); // 'te' (Telugu)
console.log(detection.confidence); // 0.95
```

## Provider Switching

Switch between OpenAI and Anthropic:

```typescript
// Using OpenAI
const openaiEngine = new AIEngineService({
  provider: {
    provider: AIProvider.OPENAI,
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  },
  // ... other config
});

// Using Anthropic
const anthropicEngine = new AIEngineService({
  provider: {
    provider: AIProvider.ANTHROPIC,
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-sonnet-20240229',
  },
  // ... other config
});
```

## Environment Variables

```bash
# AI Provider (choose one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Knowledge Base (optional)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX=whatsapp-ai-knowledge
```

## Supported Languages

- **English** (`en`): Full support
- **Telugu** (`te`): Full support with native script
- **Hindi** (`hi`): Full support with Devanagari script

## Architecture

```
ai-engine/
├── providers/          # AI provider implementations
│   ├── openai.provider.ts
│   ├── anthropic.provider.ts
│   └── provider.interface.ts
├── knowledge/          # Knowledge base service
│   └── knowledge-base.service.ts
├── utils/              # Utilities
│   └── language-detector.ts
├── types/              # TypeScript types
│   └── index.ts
└── ai-engine.service.ts # Main orchestrator
```

## Error Handling

```typescript
import { AIEngineError, ProviderError, KnowledgeBaseError } from '@whatsapp-ai/ai-engine';

try {
  const response = await aiEngine.generateResponse(options);
} catch (error) {
  if (error instanceof ProviderError) {
    console.error('AI provider error:', error.message);
  } else if (error instanceof KnowledgeBaseError) {
    console.error('Knowledge base error:', error.message);
  } else if (error instanceof AIEngineError) {
    console.error('AI engine error:', error.code, error.message);
  }
}
```

## Health Check

```typescript
const health = await aiEngine.healthCheck();
console.log(health.aiProvider); // true/false
console.log(health.knowledgeBase); // true/false
console.log(health.overall); // true/false
```

## Best Practices

1. **Initialize once**: Create a single AIEngineService instance and reuse it
2. **Limit history**: Set `conversationHistoryLimit` to avoid token limits
3. **Use knowledge base**: Enable for domain-specific accurate responses
4. **Handle errors**: Implement proper error handling for production
5. **Monitor usage**: Track token usage via response metadata

## License

MIT
