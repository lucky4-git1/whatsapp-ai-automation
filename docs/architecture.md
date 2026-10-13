# System Architecture

## Overview

The WhatsApp AI Automation Platform is built as a modular monolith with a clear separation of concerns. The architecture supports multi-tenancy, horizontal scalability, and maintainability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - Web Dashboard   - Inbox UI   - Flow Builder   - Analytics│
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼────────────────────────────────────┐
│                     API Server (Fastify)                     │
│  - Auth & RBAC   - REST APIs   - WebSocket   - Rate Limiting│
└───────┬──────────────────────┬──────────────────────────────┘
        │                      │
        │                      │
┌───────▼────────┐    ┌────────▼─────────┐
│   PostgreSQL   │    │      Redis       │
│  - Primary DB  │    │  - Cache         │
│  - Prisma ORM  │    │  - Sessions      │
└────────────────┘    │  - Job Queue     │
                      └──────────────────┘
        │
        │
┌───────▼────────────────────────────────────────────────────┐
│                  Background Workers (BullMQ)                │
│  - Message Processing   - AI Inference   - Campaigns        │
│  - Workflow Execution   - Scheduled Tasks   - Webhooks      │
└───────┬────────────────────────────────────────────────────┘
        │
        │
┌───────▼────────────────────────────────────────────────────┐
│                  External Integrations                      │
│  - WhatsApp Cloud API   - AI Providers   - Payment Gateways│
└────────────────────────────────────────────────────────────┘
```

## Application Layers

### 1. Presentation Layer (Frontend)

**Technology**: React + TypeScript + Vite

**Responsibilities**:
- User interface rendering
- Client-side state management
- Form validation
- Real-time updates via WebSockets
- Visual workflow editor

**Key Components**:
- Authentication pages
- Dashboard and analytics
- Conversation inbox
- Contact management
- Workflow builder (React Flow)
- Campaign manager
- Settings and configuration

### 2. API Layer (Backend)

**Technology**: Fastify + TypeScript

**Responsibilities**:
- Request routing and validation
- Authentication and authorization
- Business logic orchestration
- Response formatting
- Rate limiting
- CORS and security headers

**Key Modules**:
- `routes/`: HTTP endpoint definitions
- `services/`: Business logic
- `middleware/`: Auth, validation, error handling
- `server.ts`: Application bootstrap

### 3. Service Layer

**Core Services**:

**AuthService**
- User registration and login
- Password hashing (bcrypt)
- JWT token management
- Session handling

**WorkspaceService**
- Multi-tenant workspace management
- Team member invitations
- Role assignment

**WhatsAppService**
- Provider abstraction
- Account connection
- Credential encryption
- Webhook processing
- Template synchronization

**ContactService**
- Contact CRUD operations
- Phone normalization
- Tag management
- Segmentation

**ConversationService**
- Inbox management
- Message threading
- Agent assignment
- Human takeover

**AIService** (Future)
- Intent classification
- Knowledge retrieval
- Response generation
- Multilingual support

**WorkflowService** (Future)
- Workflow execution engine
- Node processing
- State management
- Error recovery

**CampaignService** (Future)
- Audience filtering
- Consent validation
- Message scheduling
- Delivery tracking

### 4. Data Layer

**PostgreSQL Schema**:

Organized into logical domains:
- **Authentication & Tenancy**: users, organizations, workspaces, memberships
- **WhatsApp Integration**: whatsapp_accounts, webhook_events, message_templates
- **Conversations**: contacts, conversations, messages, message_status_events
- **AI & Automation**: assistant_configurations, knowledge_sources, workflow_definitions
- **Business Operations**: leads, appointments, orders, products
- **Campaigns**: campaigns, campaign_recipients
- **System**: audit_logs, idempotency_records, scheduled_tasks

**Data Isolation**:
- Row-level workspace scoping on all tenant data
- Foreign key constraints
- Cascade deletes where appropriate
- Indexed for query performance

### 5. Integration Layer

**WhatsApp Provider Package**:
```
packages/whatsapp-provider/
├── provider.interface.ts      # Abstract provider interface
├── cloud-api/
│   └── cloud-api.provider.ts  # Meta Cloud API implementation
├── webhook/
│   ├── webhook.handler.ts     # Event parser and normalizer
│   └── signature.validator.ts # HMAC SHA256 validation
└── types.ts                   # Provider types
```

**Provider Interface**:
- `sendMessage()`: Send text, templates, or media
- `getTemplates()`: Sync approved templates
- `getPhoneNumberInfo()`: Verify connection
- `downloadMedia()`: Retrieve media files
- `uploadMedia()`: Upload media to WhatsApp
- `markAsRead()`: Update read status
- `healthCheck()`: Monitor provider status

**Why Provider Abstraction?**
- Swap providers without changing business logic
- Add alternative providers (e.g., WhatsApp Business API On-Premises)
- Mock for testing
- Isolate provider-specific error handling

### 6. Background Job System

**Technology**: BullMQ + Redis

**Job Types**:

1. **Webhook Processing**
   - Parse incoming events
   - Create/update contacts
   - Route messages to conversations
   - Update message statuses

2. **AI Processing**
   - Classify intent
   - Retrieve knowledge
   - Generate responses
   - Execute tool calls

3. **Workflow Execution**
   - Execute nodes sequentially
   - Handle delays and conditions
   - Manage execution state
   - Retry on failure

4. **Campaign Execution**
   - Filter eligible recipients
   - Validate consent
   - Send messages in batches
   - Track delivery

5. **Scheduled Tasks**
   - Follow-up reminders
   - Appointment notifications
   - Template sync
   - Health checks

**Job Processing Patterns**:
- Idempotent by design
- Exponential backoff with jitter
- Dead-letter queue for failures
- Per-tenant concurrency limits
- Graceful degradation

## Security Architecture

### Authentication Flow

```
1. User submits credentials
2. API validates and hashes password
3. Generate JWT with user ID and expiry
4. Return token to client
5. Client includes token in Authorization header
6. API validates JWT signature and expiry
7. Extract user ID and fetch permissions
8. Authorize request based on RBAC
```

### Authorization Model

**Role-Based Access Control (RBAC)**:
- Roles: Owner, Admin, Supervisor, Agent, Marketing Manager, Analyst
- Permissions: Granular actions (e.g., `conversation:reply`, `campaign:launch`)
- Role-permission mapping in `shared/constants.ts`
- Permission checks on every protected route

**Tenant Isolation**:
- Workspace ID in request headers (`X-Workspace-Id`)
- All queries scoped by workspace
- Membership validation on workspace access
- No cross-tenant data leakage

### Data Protection

**Encryption at Rest**:
- WhatsApp access tokens encrypted with AES-256-CBC
- Encryption key stored in environment variable
- IV stored with encrypted data

**Encryption in Transit**:
- HTTPS/TLS for all API communication
- Secure WebSocket connections (WSS)

**Secrets Management**:
- Environment variables for configuration
- Never log sensitive data
- Redaction in structured logs
- Credential rotation support

## Scalability Considerations

### Horizontal Scaling

**API Servers**:
- Stateless design
- Session data in Redis
- Load balancer with sticky sessions for WebSockets

**Background Workers**:
- Multiple worker processes
- Redis-backed job queue
- Automatic job distribution
- Worker health monitoring

**Database**:
- Read replicas for analytics
- Connection pooling
- Index optimization
- Partitioning for large tables (future)

### Performance Optimization

**Caching Strategy**:
- Redis for frequently accessed data
- Template cache with TTL
- Contact lookup cache
- Workspace membership cache

**Query Optimization**:
- Appropriate indexes on all foreign keys
- Compound indexes for common queries
- EXPLAIN ANALYZE for slow queries
- N+1 query prevention

**Rate Limiting**:
- Per-user API rate limits
- Per-workspace WhatsApp message limits
- Provider rate limit handling
- Backpressure mechanisms

## Reliability Patterns

### Idempotency

**Webhook Processing**:
- Deduplication using provider message IDs
- Idempotency records table
- Unique constraints on critical records

**Message Sending**:
- Transactional outbox pattern
- State machine for message lifecycle
- Retry with same message ID

### Error Handling

**Retry Strategy**:
- Exponential backoff with jitter
- Maximum retry attempts
- Different strategies per error type
- Circuit breaker for failing providers

**Graceful Degradation**:
- AI failures fall back to human agents
- Webhook processing failures logged and retryable
- Provider outages don't block other operations

### Monitoring & Observability

**Structured Logging**:
- JSON logs with Pino
- Request correlation IDs
- Sensitive data redaction
- Contextual information

**Metrics** (Future):
- API response times
- Message delivery rates
- Workflow execution duration
- Queue depth and latency
- Provider health status

**Health Checks**:
- `/health`: Basic liveness
- `/health/ready`: Readiness (includes DB check)
- Provider health endpoints

## Deployment Architecture

### Development

```
docker-compose.yml
├── postgres (port 5432)
├── redis (port 6379)
├── api (port 4000)
├── worker
└── web (port 3000)
```

### Production (Recommended)

```
┌─────────────────┐
│  Load Balancer  │ (HTTPS termination)
└────────┬────────┘
         │
    ┌────┴────┐
    │   API   │ (Multiple instances)
    │ Servers │
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───▼────┐         ┌──────▼──────┐
│   DB   │         │   Workers   │ (Multiple instances)
│ Primary│         │  (BullMQ)   │
└───┬────┘         └─────────────┘
    │
┌───▼────┐
│   DB   │
│ Replica│
└────────┘
```

**Infrastructure Requirements**:
- PostgreSQL 15+ (managed service recommended)
- Redis 7+ (managed service recommended)
- Node.js 20+ runtime
- HTTPS with valid SSL certificate
- Object storage for media files (S3, GCS, etc.)

## Technology Decisions

### Why Fastify?
- High performance (10x faster than Express)
- TypeScript-first with excellent types
- Schema-based validation
- Plugin ecosystem
- JSON serialization optimization

### Why Prisma?
- Type-safe database access
- Automatic migrations
- Excellent TypeScript support
- Good documentation
- Active community

### Why BullMQ?
- Redis-backed reliability
- Job scheduling and delays
- Priority queues
- Retries and backoff
- Good monitoring tools

### Why React?
- Large ecosystem
- Excellent developer experience
- React Flow for workflow builder
- TanStack Query for server state
- Bootstrap 5 for consistent UI

## Future Enhancements

1. **Microservices**: Split into API, Worker, and Workflow services
2. **Event Streaming**: Kafka for event-driven architecture
3. **Caching Layer**: CDN for static assets, Redis for API cache
4. **Search**: Elasticsearch for full-text search
5. **Analytics**: ClickHouse for real-time analytics
6. **ML Pipeline**: Separate service for AI model inference
7. **Observability**: Prometheus, Grafana, Sentry
8. **Multi-region**: Deploy in multiple regions for low latency
