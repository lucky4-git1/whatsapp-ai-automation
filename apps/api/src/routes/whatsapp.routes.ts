import { FastifyInstance } from 'fastify';
import { whatsappService } from '../services/whatsapp.service';
import { WebhookSignatureValidator } from '@whatsapp-automation/whatsapp-provider';
import {
  authenticate,
  requireWorkspace,
  requirePermission,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { PERMISSIONS, ERROR_CODES } from '@whatsapp-automation/shared';
import { prisma } from '@whatsapp-automation/database';
import { z } from 'zod';

const connectAccountSchema = z.object({
  name: z.string().min(1).max(255),
  businessAccountId: z.string(),
  phoneNumberId: z.string(),
  phoneNumber: z.string(),
  accessToken: z.string().min(1),
  webhookSecret: z.string().optional(),
});

export async function whatsappRoutes(server: FastifyInstance) {
  // Webhook verification (GET) - no authentication required
  server.get('/webhook', async (request, reply) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (!mode || !token || !challenge) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Missing required parameters',
        },
      });
    }

    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Webhook secret not configured',
        },
      });
    }

    const validator = new WebhookSignatureValidator(webhookSecret);
    const result = validator.verifyChallenge(
      mode as string,
      token as string,
      challenge as string
    );

    if (result) {
      return reply.send(result);
    }

    return reply.status(403).send({
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Verification failed',
      },
    });
  });

  // Webhook events (POST) - no authentication, but signature verified
  server.post('/webhook', {
    config: {
      // Disable body parsing to access raw body for signature validation
      rawBody: true,
    },
  }, async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);

    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Webhook secret not configured',
        },
      });
    }

    // Validate signature
    const validator = new WebhookSignatureValidator(webhookSecret);
    if (!validator.validate(signature, rawBody)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: 'Invalid webhook signature',
        },
      });
    }

    // Store webhook event for async processing
    const payload = request.body as any;
    
    try {
      // Extract event ID for idempotency
      const eventId = payload.entry?.[0]?.id + '_' + payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;

      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventId: eventId || null,
          eventType: 'whatsapp_message',
          payload,
          signature,
          isVerified: true,
        },
      });

      // Process asynchronously (in production, this would be queued)
      whatsappService.processWebhookEvent(webhookEvent.id).catch((error) => {
        server.log.error({ error, eventId: webhookEvent.id }, 'Failed to process webhook event');
      });

      // Acknowledge receipt immediately
      return reply.send({ success: true });
    } catch (error) {
      server.log.error({ error }, 'Failed to store webhook event');
      
      // Still acknowledge to prevent retries
      return reply.send({ success: true });
    }
  });

  // Protected routes - require authentication and workspace
  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  // Connect WhatsApp account
  server.post(
    '/accounts',
    { preHandler: [requirePermission(PERMISSIONS.SETTINGS_UPDATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const data = connectAccountSchema.parse(request.body);
      
      const account = await whatsappService.connectAccount(
        request.workspaceId!,
        data
      );
      
      return reply.status(201).send({
        success: true,
        data: { account },
      });
    }
  );

  // List WhatsApp accounts
  server.get(
    '/accounts',
    async (request: AuthenticatedRequest, reply) => {
      const accounts = await prisma.whatsAppAccount.findMany({
        where: {
          workspaceId: request.workspaceId!,
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          displayPhoneNumber: true,
          verifiedName: true,
          status: true,
          isConnected: true,
          qualityRating: true,
          lastSyncAt: true,
          createdAt: true,
          _count: {
            select: {
              conversations: true,
              messages: true,
            },
          },
        },
      });
      
      return reply.send({
        success: true,
        data: { accounts },
      });
    }
  );

  // Get WhatsApp account
  server.get(
    '/accounts/:accountId',
    async (request: AuthenticatedRequest, reply) => {
      const { accountId } = request.params as { accountId: string };
      
      const account = await prisma.whatsAppAccount.findFirst({
        where: {
          id: accountId,
          workspaceId: request.workspaceId!,
        },
        include: {
          _count: {
            select: {
              conversations: true,
              messages: true,
              templates: true,
            },
          },
        },
      });

      if (!account) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'WhatsApp account not found',
          },
        });
      }
      
      // Don't expose encrypted credentials
      const { credentialsEncrypted, ...safeAccount } = account;
      
      return reply.send({
        success: true,
        data: { account: safeAccount },
      });
    }
  );

  // Disconnect WhatsApp account
  server.delete(
    '/accounts/:accountId',
    { preHandler: [requirePermission(PERMISSIONS.SETTINGS_UPDATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { accountId } = request.params as { accountId: string };
      
      await whatsappService.disconnectAccount(request.workspaceId!, accountId);
      
      return reply.send({
        success: true,
        data: { message: 'WhatsApp account disconnected' },
      });
    }
  );

  // Sync templates
  server.post(
    '/accounts/:accountId/sync-templates',
    { preHandler: [requirePermission(PERMISSIONS.SETTINGS_UPDATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { accountId } = request.params as { accountId: string };
      
      const templates = await whatsappService.syncTemplates(
        request.workspaceId!,
        accountId
      );
      
      return reply.send({
        success: true,
        data: { templates, count: templates.length },
      });
    }
  );

  // List templates
  server.get(
    '/accounts/:accountId/templates',
    async (request: AuthenticatedRequest, reply) => {
      const { accountId } = request.params as { accountId: string };
      
      const templates = await prisma.messageTemplate.findMany({
        where: {
          whatsappAccountId: accountId,
          workspaceId: request.workspaceId!,
        },
        orderBy: {
          name: 'asc',
        },
      });
      
      return reply.send({
        success: true,
        data: { templates },
      });
    }
  );

  // Health check for account
  server.get(
    '/accounts/:accountId/health',
    async (request: AuthenticatedRequest, reply) => {
      const { accountId } = request.params as { accountId: string };
      
      try {
        const provider = await whatsappService.getProvider(accountId);
        const health = await provider.healthCheck();
        
        return reply.send({
          success: true,
          data: health,
        });
      } catch (error) {
        return reply.status(503).send({
          success: false,
          error: {
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            message: 'WhatsApp provider health check failed',
            details: error,
          },
        });
      }
    }
  );
}
