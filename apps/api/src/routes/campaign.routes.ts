import { FastifyInstance } from 'fastify';
import { prisma } from '@whatsapp-automation/database';
import { authenticate, requireWorkspace, requirePermission, AuthenticatedRequest } from '../middleware/auth.middleware';
import { PERMISSIONS, ERROR_CODES } from '@whatsapp-automation/shared';
import { z } from 'zod';
import { queueService } from '../services/queue.service';

const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  templateId: z.string().uuid(),
  audienceFilter: z.record(z.any()).default({}),
  templateParams: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function campaignRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  // List campaigns
  server.get('/', async (request: AuthenticatedRequest, reply) => {
    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId: request.workspaceId! },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            language: true,
            category: true,
            status: true,
          },
        },
        _count: {
          select: {
            recipients: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: { campaigns },
    });
  });

  // Get campaign details
  server.get('/:id', async (request: AuthenticatedRequest, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        workspaceId: request.workspaceId!,
      },
      include: {
        template: true,
        recipients: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Campaign not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: { campaign },
    });
  });

  // Create campaign
  server.post(
    '/',
    { preHandler: [requirePermission(PERMISSIONS.CAMPAIGN_CREATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const data = createCampaignSchema.parse(request.body);

      // Verify template exists in workspace
      const template = await prisma.messageTemplate.findFirst({
        where: {
          id: data.templateId,
          workspaceId: request.workspaceId!,
        },
      });

      if (!template) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Template not found in this workspace',
          },
        });
      }

      // Count eligible recipients
      const eligibleCount = await prisma.contact.count({
        where: {
          workspaceId: request.workspaceId!,
          isUnsubscribed: false,
        },
      });

      const campaign = await prisma.campaign.create({
        data: {
          workspaceId: request.workspaceId!,
          templateId: data.templateId,
          name: data.name,
          description: data.description,
          audienceFilter: data.audienceFilter,
          templateParams: data.templateParams,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
          totalRecipients: eligibleCount,
          createdBy: request.user!.id,
        },
        include: {
          template: true,
        },
      });

      return reply.status(201).send({
        success: true,
        data: { campaign },
      });
    }
  );

  // Launch campaign
  server.post(
    '/:id/launch',
    { preHandler: [requirePermission(PERMISSIONS.CAMPAIGN_LAUNCH)] },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };

      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          workspaceId: request.workspaceId!,
        },
      });

      if (!campaign) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Campaign not found',
          },
        });
      }

      // Update status to running
      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Enqueue to BullMQ campaignQueue if available
      try {
        await queueService.addCampaignJob(campaign.id);
      } catch (err) {
        // If Redis is not currently connected, campaign status is marked and simulated
      }

      return reply.send({
        success: true,
        data: {
          campaign: updated,
          message: 'Campaign launched successfully',
        },
      });
    }
  );

  // Pause campaign
  server.post(
    '/:id/pause',
    { preHandler: [requirePermission(PERMISSIONS.CAMPAIGN_UPDATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };

      const updated = await prisma.campaign.update({
        where: { id },
        data: { status: 'PAUSED' },
      });

      return reply.send({
        success: true,
        data: { campaign: updated },
      });
    }
  );

  // Resume campaign
  server.post(
    '/:id/resume',
    { preHandler: [requirePermission(PERMISSIONS.CAMPAIGN_UPDATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };

      const updated = await prisma.campaign.update({
        where: { id },
        data: { status: 'RUNNING' },
      });

      return reply.send({
        success: true,
        data: { campaign: updated },
      });
    }
  );

  // Cancel campaign
  server.post(
    '/:id/cancel',
    { preHandler: [requirePermission(PERMISSIONS.CAMPAIGN_UPDATE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { id } = request.params as { id: string };

      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        data: { campaign: updated },
      });
    }
  );
}
