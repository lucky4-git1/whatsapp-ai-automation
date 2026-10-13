# AI Integration Guide

This guide covers the AI-powered conversation features of the WhatsApp AI Automation platform.

## Overview

The platform includes a sophisticated AI engine that powers intelligent, context-aware conversations with customers. The AI system supports:

- **Multiple AI Providers**: OpenAI (GPT-4) and Anthropic (Claude)
- **Knowledge Base**: Vector-based semantic search for accurate, domain-specific responses
- **Multilingual Support**: English, Telugu, and Hindi with automatic language detection
- **Context Awareness**: Maintains conversation history and customer context
- **Confidence Scoring**: Each AI response includes a confidence score

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  AI Routes   │  │ Conversation │  │   Webhook    │ │
│  │              │  │   Service    │  │   Handler    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  AI Conversation│
                    │     Service     │
                    └────────┬────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                  │
     ┌──────▼──────┐                  ┌───────▼───────┐
     │  AI Engine  │                  │   Knowledge   │
     │   Service   │◄─────────────────┤     Base      │
     └──────┬──────┘                  │    Service    │
            │                          └───────┬───────┘
            │                                  │
    ┌───────┴───────┐                  ┌──────▼──────┐
    │               │                  │   Pinecone  │
┌───▼────┐  ┌──────▼──────┐          │   Vector DB │
│ OpenAI │  │  Anthropic  │          └─────────────┘
│   API  │  │     API     │
└────────┘  └─────────────┘
```

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# AI Provider
AI_PROVIDER=openai
AI_MODEL=gpt-4-turbo-preview
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000
OPENAI_API_KEY=sk-...
# OR for Anthropic
# ANTHROPIC_API_KEY=sk-ant-...

# Knowledge Base (Optional)
ENABLE_KNOWLEDGE_BASE=true
PINECONE_API_KEY=your-key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX=whatsapp-ai-knowledge
KNOWLEDGE_SIMILARITY_THRESHOLD=0.7
KNOWLEDGE_MAX_RESULTS=5

# Conversation Settings
CONVERSATION_HISTORY_LIMIT=10
ENABLE_AUTO_DETECT_LANGUAGE=true
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Pinecone Index (Optional)

If using knowledge base features:

1. Sign up at [pinecone.io](https://www.pinecone.io/)
2. Create a new index:
   - Name: `whatsapp-ai-knowledge`
   - Dimensions: `1536` (for OpenAI text-embedding-3-small)
   - Metric: `cosine`
   - Cloud: AWS
   - Region: `us-east-1`

## API Endpoints

### Generate AI Response

Generate an AI response for a conversation.

```http
POST /api/v1/ai/generate-response
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "uuid",
  "message": "What are your business hours?" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "We are open Monday to Friday, 9 AM to 6 PM IST.",
    "confidence": 0.95,
    "language": "en",
    "usedKnowledgeBase": true,
    "sources": [
      {
        "id": "doc-123",
        "title": "Business Hours",
        "content": "...",
        "relevanceScore": 0.92
      }
    ],
    "metadata": {
      "tokensUsed": 150,
      "latencyMs": 1200,
      "provider": "openai"
    }
  }
}
```

### Add Knowledge Document

Add a document to the knowledge base.

```http
POST /api/v1/ai/knowledge/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Return Policy",
  "content": "We offer 30-day returns on all products...",
  "language": "en",
  "tags": ["policy", "returns"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "doc-456",
    "title": "Return Policy",
    "language": "en",
    "tags": ["policy", "returns"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Search Knowledge Base

Search for relevant documents.

```http
POST /api/v1/ai/knowledge/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "How do I return a product?",
  "language": "en",
  "limit": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc-456",
      "title": "Return Policy",
      "content": "We offer 30-day returns...",
      "relevanceScore": 0.92,
      "metadata": {
        "language": "en",
        "tags": ["policy", "returns"]
      }
    }
  ]
}
```

### Delete Knowledge Document

```http
DELETE /api/v1/ai/knowledge/documents/:documentId
Authorization: Bearer <token>
```

### AI Health Check

Check AI system health.

```http
GET /api/v1/ai/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "aiProvider": true,
    "knowledgeBase": true,
    "overall": true
  }
}
```

### Detect Language

Detect language from text.

```http
POST /api/v1/ai/detect-language
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "నమస్కారం"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "te",
    "confidence": 0.95
  }
}
```

## Usage

### Enable AI for a Conversation

AI can be toggled on/off per conversation:

```http
PATCH /api/v1/conversations/:id/ai
Content-Type: application/json

{
  "isAiEnabled": true
}
```

When enabled:
1. Incoming messages automatically trigger AI responses
2. AI analyzes conversation history for context
3. Knowledge base is searched for relevant information
4. Response is generated in the detected language
5. Message is saved with AI metadata

### Automatic Processing

When a message arrives via webhook:

1. **Webhook receives message** → `whatsappRoutes`
2. **Message saved to database** → `conversationService`
3. **AI processing triggered** → `aiConversationService.processIncomingMessage()`
4. **Context built** from conversation history
5. **Language detected** from message content
6. **Knowledge base searched** for relevant info
7. **AI generates response** using provider (OpenAI/Anthropic)
8. **Response saved** with confidence score and metadata
9. **Message sent** via WhatsApp API (Phase 6)

### Custom System Prompts

Customize AI behavior per workspace by adding to workspace preferences:

```typescript
await prisma.workspace.update({
  where: { id: workspaceId },
  data: {
    preferences: {
      aiSystemPrompt: `You are a helpful assistant for {Company Name}.
      - Always be professional and friendly
      - Focus on helping customers with their orders
      - Escalate complex issues to human agents
      - Never share personal customer information`
    }
  }
});
```

## Multilingual Support

### Supported Languages

| Language | Code | Script | Auto-Detection |
|----------|------|--------|----------------|
| English  | `en` | Latin  | ✅ |
| Telugu   | `te` | Telugu | ✅ |
| Hindi    | `hi` | Devanagari | ✅ |

### Language Detection

The system automatically detects language from:

1. **Script detection**: Unicode character ranges
2. **Word detection**: Common words in romanized form
3. **Confidence scoring**: Based on character percentage

Example detections:
- "Hello, how are you?" → English (0.95)
- "నమస్కారం, మీరు ఎలా ఉన్నారు?" → Telugu (0.98)
- "नमस्ते, आप कैसे हैं?" → Hindi (0.97)
- "meeru ela unnaru" → Telugu (0.60) // Romanized Telugu

### Adding More Languages

To add a new language:

1. **Update types** in `packages/ai-engine/src/types/index.ts`:
```typescript
export enum SupportedLanguage {
  ENGLISH = 'en',
  TELUGU = 'te',
  HINDI = 'hi',
  TAMIL = 'ta', // New language
}
```

2. **Update detector** in `packages/ai-engine/src/utils/language-detector.ts`:
```typescript
private static readonly TAMIL_RANGE = /[\u0B80-\u0BFF]/;
```

3. **Add detection logic** in `detect()` method
4. **Update language names** in helper methods

## Knowledge Base Best Practices

### Document Structure

```typescript
{
  title: "Clear, descriptive title",
  content: `
    Use clear, concise language.
    Break into logical paragraphs.
    Include relevant keywords.
    Avoid ambiguous pronouns.
  `,
  language: "en", // or "te", "hi"
  tags: ["category", "topic", "product"],
  metadata: {
    category: "FAQ",
    lastReviewed: "2024-01-15",
    author: "Support Team"
  }
}
```

### Content Guidelines

1. **Be Specific**: Avoid vague statements
2. **Use Keywords**: Include terms customers use
3. **Stay Current**: Update regularly
4. **Consistent Format**: Use similar structure across documents
5. **Language-Specific**: Create versions for each language

### Similarity Threshold

- **0.8-1.0**: High precision, may miss relevant docs
- **0.7-0.8**: Balanced (recommended)
- **0.5-0.7**: High recall, may include less relevant docs
- **<0.5**: Very broad, many false positives

## Monitoring & Debugging

### Response Metadata

Each AI response includes:

```typescript
{
  metadata: {
    tokensUsed: 150,      // Total tokens (input + output)
    latencyMs: 1200,      // Response time in milliseconds
    provider: "openai",   // AI provider used
  }
}
```

### Conversation Metadata

AI-generated messages include:

```typescript
{
  metadata: {
    isAiGenerated: true,
    confidence: 0.95,
    provider: "openai",
    tokensUsed: 150,
    usedKnowledgeBase: true,
    sources: [
      { title: "...", relevance: 0.92 }
    ]
  }
}
```

### Logging

AI operations are logged with context:

```typescript
logger.info('AI response generated', {
  conversationId: 'conv-123',
  confidence: 0.95,
  usedKnowledgeBase: true,
  tokensUsed: 150,
  latencyMs: 1200,
});
```

### Health Checks

Monitor AI system health:

```bash
curl http://localhost:4000/api/v1/ai/health \
  -H "Authorization: Bearer <token>"
```

## Error Handling

The AI system degrades gracefully:

1. **Provider Unavailable**: Returns null, doesn't throw
2. **Knowledge Base Error**: Continues without KB results
3. **Language Detection Failure**: Defaults to English
4. **Low Confidence**: Response still returned with confidence score

## Cost Optimization

### Token Usage

- **GPT-4 Turbo**: ~$0.01/1K input, ~$0.03/1K output tokens
- **Claude 3 Sonnet**: ~$0.003/1K input, ~$0.015/1K output tokens

### Optimization Strategies

1. **Limit History**: Set `CONVERSATION_HISTORY_LIMIT=10`
2. **Reduce Max Tokens**: Set `AI_MAX_TOKENS=500` for shorter responses
3. **Cache Embeddings**: Embeddings generated once per document
4. **Use Claude**: Anthropic is often cheaper than GPT-4
5. **Knowledge Base**: More accurate responses = fewer retries

## Security

### API Keys

- Store in environment variables
- Never commit to version control
- Rotate regularly
- Use separate keys per environment

### Data Privacy

- Messages encrypted at rest in database
- API keys encrypted with AES-256
- No customer data sent to AI without consent
- Knowledge base per workspace (tenant isolation)

### Rate Limiting

Apply rate limits to AI endpoints:

```typescript
await server.register(rateLimit, {
  max: 10, // 10 requests
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many AI requests'
  })
});
```

## Next Steps

- [ ] Implement background worker for async AI processing (Phase 6)
- [ ] Add AI response quality feedback loop
- [ ] Build conversation flow automation (Phase 5)
- [ ] Create AI analytics dashboard (Phase 8)
- [ ] Fine-tune models on workspace-specific data
- [ ] Add sentiment analysis
- [ ] Implement intent classification

## Troubleshooting

### AI Not Responding

1. Check environment variables are set
2. Verify API keys are valid
3. Check AI health endpoint
4. Review logs for errors
5. Ensure conversation has `isAiEnabled: true`

### Low Quality Responses

1. Add more knowledge base documents
2. Adjust similarity threshold
3. Customize system prompt
4. Increase conversation history limit
5. Try different AI provider/model

### High Latency

1. Reduce max tokens
2. Limit conversation history
3. Disable knowledge base temporarily
4. Use faster model (e.g., GPT-3.5)
5. Implement response caching

### Language Detection Issues

1. Check message has enough text
2. Review confidence score
3. Manual override if needed
4. Add romanized word detection
5. Report edge cases for improvement
