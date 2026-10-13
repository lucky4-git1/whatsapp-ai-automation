# WhatsApp AI Automation Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.0-ef4444.svg)](https://turbo.build/repo)
[![Fastify](https://img.shields.io/badge/Fastify-4.28-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.15-2d3748.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-Proprietary-green.svg)]()

A production-grade, multi-tenant SaaS platform for autonomous WhatsApp customer communications, intelligent AI orchestration, team collaboration, and automated workflows powered by the official Meta WhatsApp Business Cloud API.

---

## 🌟 Key Features

- **🤖 Autonomous AI Engine**
  - Multi-provider LLM support (**OpenAI GPT-4 Turbo / GPT-4o**, **Anthropic Claude 3 Opus / Sonnet**)
  - Vector knowledge base semantic search powered by **Pinecone**
  - Multilingual support with automated language detection (**English, Telugu, Hindi**)
  - Autonomous customer responses with confidence scoring and human takeover safeguards

- **💬 Real-Time Unified Inbox**
  - Multi-agent conversational workspace with conversation reassignment
  - Seamless human takeover mode with keyword-triggered AI pause
  - Rich media messaging (text, templates, media, documents)
  - Full conversation audit trail and message delivery status tracking

- **📱 Official Meta WhatsApp Cloud API Integration**
  - Multi-account management with independent phone number IDs and credentials
  - Cryptographic HMAC-SHA256 webhook signature verification
  - Deduplicated, idempotent event ingestion pipeline
  - Template synchronization and broadcast management

- **⚙️ Workflow & Campaign Engine**
  - Multi-step event-driven automation engine with conditional branching
  - High-throughput background processing with **BullMQ** & **Redis**
  - Contact segmentation, tagging, and targeted outbound campaigns
  - Graceful worker shutdowns and automatic retry with exponential backoff

- **👥 Multi-Tenant SaaS Architecture**
  - Hierarchical Organization & Workspace isolation
  - Role-Based Access Control (**Owner**, **Admin**, **Agent**)
  - JWT token and HTTP-only session cookies with request throttling & Helmet protection
  - Structured JSON logging via **Pino**

- **📱 Polished & Responsive UI**
  - Clean, modern dashboard built with React 18, Vite & Bootstrap 5
  - Fully responsive design with mobile drawer navigation & adaptive layouts
  - Quick-Launch Presentation / Demo Mode for stakeholders and live reviews

---

## 🏗️ Architecture Overview

```mermaid
graph TD
  User[Browser / Client] -->|HTTP / React 18| WebApp[apps/web (Vite Dashboard)]
  Meta[Meta WhatsApp Cloud API] -->|Webhooks| API[apps/api (Fastify REST)]
  WebApp -->|REST API| API
  
  subgraph Data Layer
    DB[(PostgreSQL 15+)]
    Redis[(Redis 7+)]
  end
  
  API --> DB
  API --> Redis
  
  subgraph Background Workers
    Worker[apps/worker (BullMQ)]
  end
  
  Redis --> Worker
  Worker --> DB
  Worker -->|Outbound Messages| Meta
  
  subgraph AI Orchestration
    AIEngine[packages/ai-engine]
    Pinecone[(Pinecone Vector DB)]
    OpenAI[OpenAI / Anthropic]
  end
  
  Worker --> AIEngine
  API --> AIEngine
  AIEngine --> Pinecone
  AIEngine --> OpenAI
```

---

## 📁 Repository Structure

```
whatsapp-ai-automation/
├── apps/
│   ├── api/                   # Fastify HTTP REST API server
│   ├── web/                   # React 18 + Vite frontend dashboard
│   └── worker/                # BullMQ queue processors for background tasks
├── packages/
│   ├── ai-engine/             # LLM provider orchestration, multilingual & Pinecone
│   ├── database/              # Prisma ORM schema, migrations, and database client
│   ├── observability/         # Pino logging, metrics, and error serializers
│   ├── shared/                # Universal TypeScript interfaces, constants, permissions
│   ├── validation/            # Zod validation schemas
│   ├── whatsapp-provider/     # Official Meta Graph API adapter & webhook validator
│   └── workflow-engine/       # Visual workflow rule evaluation engine
├── docs/                      # Architectural specs, deployment notes & phase summaries
├── docker-compose.yml         # Container configuration for Redis and PostgreSQL
├── package.json               # Monorepo root workspace configuration
└── turbo.json                 # Turborepo task pipeline definition
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **PostgreSQL**: `>= 15.0`
- **Redis**: `>= 7.0` (for BullMQ queues)

### 1. Installation

Clone the repository and install all monorepo dependencies:

```bash
git clone https://github.com/lucky4-git1/whatsapp-ai-automation.git
cd whatsapp-ai-automation
npm install
```

### 2. Configure Environment

Copy the example configuration to `.env`:

```bash
cp .env.example .env
```

Ensure the key values in `.env` are updated:

```env
# Database & Cache
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_automation"
REDIS_URL="redis://localhost:6379"

# Security
JWT_SECRET="replace-with-a-secure-random-32-character-secret"
SESSION_SECRET="replace-with-a-secure-random-32-character-secret"

# Ports
API_PORT=4000
VITE_API_URL="http://localhost:4000"

# AI Provider (Optional for testing)
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
```

### 3. Database Migration

Generate the Prisma client and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Running Locally

To run all services concurrently in development mode (Web UI + API Server + Background Worker):

```bash
npm run dev
```

Or run individual apps:

```bash
# Frontend Dashboard (http://localhost:3000)
npm run dev --workspace=@whatsapp-automation/web

# Backend API (http://localhost:4000)
npm run dev --workspace=@whatsapp-automation/api

# Background Queue Worker
npm run dev --workspace=@whatsapp-automation/worker
```

---

## 🎭 Presentation & Demo Mode

For live presentations and stakeholder reviews:
1. Navigate to `http://localhost:3000/login`
2. Click **"Quick Launch Demo (Presentation Mode)"** at the bottom of the login card.
3. This instantly loads the authenticated executive workspace with pre-populated navigation, metrics, team controls, and sample conversations without requiring live Meta webhook configurations.

---

## 🧪 Testing & Verification

Run monorepo-wide type checking and production builds:

```bash
# Type check all 10 packages
npm run type-check

# Compile and build all production bundles
npm run build

# Run automated tests
npm run test
```

---

## 🔒 Security & Best Practices

- **Zero-Trust Multi-Tenancy**: Every database query scopes through `workspaceId` and `organizationId`.
- **HMAC Verification**: Webhooks from Meta are rejected if the `X-Hub-Signature-256` header fails HMAC-SHA256 validation.
- **Header Protection**: Fastify configured with secure Helmet CSP policies and CORS origin validation.
- **Sensitive Redaction**: Database connection strings, API keys, and auth tokens are stripped from Pino logs automatically.

---

## 📄 License

Proprietary and Confidential. All rights reserved.
