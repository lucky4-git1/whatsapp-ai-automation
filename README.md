# WhatsApp AI Automation Platform

A production-grade, multi-tenant SaaS platform for AI-powered WhatsApp customer communication and automation.

## Features

- 🤖 AI-powered customer support with multilingual support (English, Telugu, Hindi)
- 💬 Unified conversation inbox with human takeover
- 🎨 Visual workflow builder for conversation automation
- 📊 Lead capture, qualification, and management
- 📱 Official Meta WhatsApp Business Cloud API integration
- 📧 Template-based campaigns with consent management
- 📅 Appointment scheduling and order management
- 📈 Analytics and reporting dashboard
- 👥 Multi-tenant architecture with team collaboration
- 🔒 Enterprise-grade security and data isolation

## Technology Stack

### Frontend
- React + TypeScript
- Vite
- Bootstrap 5
- React Router
- TanStack Query
- React Flow (workflow builder)

### Backend
- Node.js + TypeScript
- Fastify
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ (background jobs)

### Infrastructure
- Docker & Docker Compose
- Automated migrations
- Health checks & monitoring

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 15
- Redis >= 7
- Docker (optional, for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lucky4-git1/whatsapp-ai-automation.git
cd whatsapp-ai-automation
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Configure your `.env` file with required credentials

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Web: http://localhost:3000
- API: http://localhost:4000

## Project Structure

```
whatsapp-ai-automation/
├── apps/
│   ├── web/           # React frontend application
│   ├── api/           # Fastify API server
│   └── worker/        # Background job worker
├── packages/
│   ├── database/      # Prisma schema and migrations
│   ├── shared/        # Shared types and utilities
│   ├── validation/    # Zod schemas
│   ├── whatsapp-provider/  # WhatsApp Cloud API adapter
│   ├── ai-engine/     # AI orchestration
│   ├── workflow-engine/    # Workflow execution engine
│   └── observability/ # Logging and monitoring
├── infra/
│   ├── docker/        # Docker configurations
│   └── deployment/    # Deployment manifests
├── docs/              # Documentation
└── tests/             # Test suites
```

## WhatsApp Setup

To connect your WhatsApp Business account:

1. Create a Meta Business account
2. Create a Meta App with WhatsApp Business API access
3. Complete business verification
4. Configure webhook URL and verify
5. Add webhook secret to `.env`
6. Connect through the platform UI

See [docs/whatsapp-setup.md](docs/whatsapp-setup.md) for detailed instructions.

## Development

```bash
# Run all apps in development mode
npm run dev

# Build all apps
npm run build

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Database operations
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run migrations
npm run db:studio     # Open Prisma Studio
```

## Testing

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for production deployment instructions.

## Security

- Never commit `.env` files
- Rotate credentials regularly
- Enable 2FA for all team members
- Review audit logs regularly
- Keep dependencies updated

Report security vulnerabilities to: security@example.com

## License

Copyright © 2024. All rights reserved.

## Support

For support, email support@example.com or open an issue on GitHub.
