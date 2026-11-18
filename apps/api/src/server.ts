import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { logger } from '@whatsapp-automation/observability';
import { ZodError } from 'zod';
import { ERROR_CODES } from '@whatsapp-automation/shared';

// Route imports
import { authRoutes } from './routes/auth.routes';
import { workspaceRoutes } from './routes/workspace.routes';
import { contactRoutes } from './routes/contact.routes';
import { conversationRoutes } from './routes/conversation.routes';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { aiRoutes } from './routes/ai.routes';
import { workflowRoutes } from './routes/workflow.routes';
import { healthRoutes } from './routes/health.routes';
import { campaignRoutes } from './routes/campaign.routes';
import { analyticsRoutes } from './routes/analytics.routes';

export async function createServer() {
  const server = Fastify({
    logger: logger as any,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register plugins
  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3020';
  const allowedOrigins = corsOriginEnv.split(',').map((o) => o.trim());

  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Meta webhooks)
      if (!origin) return cb(null, true);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        /\.vercel\.app$/.test(new URL(origin).hostname) ||
        /\.northflank\.app$/.test(new URL(origin).hostname);

      if (isAllowed) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  });

  await server.register(cookie, {
    secret: process.env.SESSION_SECRET,
    parseOptions: {},
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000,
  });

  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: error.errors,
        },
      });
    }

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    request.log.error(error);

    return reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: (error as any).code || ERROR_CODES.INTERNAL_ERROR,
        message: isDevelopment ? error.message : 'Internal server error',
        details: isDevelopment ? error.stack : undefined,
      },
    });
  });

  // Health check routes
  await server.register(healthRoutes, { prefix: '/health' });

  // API routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(workspaceRoutes, { prefix: '/api/v1/workspaces' });
  await server.register(contactRoutes, { prefix: '/api/v1/contacts' });
  await server.register(conversationRoutes, { prefix: '/api/v1/conversations' });
  await server.register(whatsappRoutes, { prefix: '/api/v1/whatsapp' });
  await server.register(aiRoutes, { prefix: '/api/v1/ai' });
  await server.register(workflowRoutes, { prefix: '/api/v1/workflows' });
  await server.register(campaignRoutes, { prefix: '/api/v1/campaigns' });
  await server.register(analyticsRoutes, { prefix: '/api/v1/analytics' });

  return server;
}
