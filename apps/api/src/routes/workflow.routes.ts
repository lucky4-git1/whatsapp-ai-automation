import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@whatsapp-automation/database';
import { ERROR_CODES } from '@whatsapp-automation/shared';
import {
  authenticate,
  requireWorkspace,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  triggerType: z.enum(['MESSAGE_RECEIVED', 'KEYWORD', 'TAG_ADDED', 'LEAD_CREATED']).default('MESSAGE_RECEIVED'),
  triggerConfig: z.record(z.any()).optional(),
  isActive: z.boolean().default(false),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  triggerType: z.enum(['MESSAGE_RECEIVED', 'KEYWORD', 'TAG_ADDED', 'LEAD_CREATED']).optional(),
  triggerConfig: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export async function workflowRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  // List all workflows in workspace
  server.get('/', async (request: AuthenticatedRequest, reply) => {
    const workspaceId = request.workspaceId!;

    const workflows = await prisma.workflowDefinition.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            nodes: true,
            executions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: { workflows },
    });
  });

  // Get single workflow with its nodes and edges
  server.get('/:id', async (request: AuthenticatedRequest, reply) => {
    const { id } = request.params as { id: string };
    const workspaceId = request.workspaceId!;

    const workflow = await prisma.workflowDefinition.findFirst({
      where: { id, workspaceId },
      include: {
        nodes: true,
        executions: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!workflow) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Workflow not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: { workflow },
    });
  });

  // Create workflow
  server.post('/', async (request: AuthenticatedRequest, reply) => {
    const workspaceId = request.workspaceId!;
    const body = createWorkflowSchema.parse(request.body);

    const workflow = await prisma.workflowDefinition.create({
      data: {
        workspaceId,
        name: body.name,
        description: body.description,
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig || {},
        isActive: body.isActive,
      },
    });

    return reply.status(201).send({
      success: true,
      data: { workflow },
    });
  });

  // Update workflow
  server.patch('/:id', async (request: AuthenticatedRequest, reply) => {
    const { id } = request.params as { id: string };
    const workspaceId = request.workspaceId!;
    const body = updateWorkflowSchema.parse(request.body);

    const existing = await prisma.workflowDefinition.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Workflow not found',
        },
      });
    }

    const workflow = await prisma.workflowDefinition.update({
      where: { id },
      data: body,
    });

    return reply.send({
      success: true,
      data: { workflow },
    });
  });

  // Toggle active status
  server.post('/:id/toggle', async (request: AuthenticatedRequest, reply) => {
    const { id } = request.params as { id: string };
    const workspaceId = request.workspaceId!;

    const existing = await prisma.workflowDefinition.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Workflow not found',
        },
      });
    }

    const workflow = await prisma.workflowDefinition.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return reply.send({
      success: true,
      data: { workflow },
    });
  });

  // Delete workflow
  server.delete('/:id', async (request: AuthenticatedRequest, reply) => {
    const { id } = request.params as { id: string };
    const workspaceId = request.workspaceId!;

    const existing = await prisma.workflowDefinition.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Workflow not found',
        },
      });
    }

    await prisma.workflowDefinition.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Workflow deleted successfully',
    });
  });
}
