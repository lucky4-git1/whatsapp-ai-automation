import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@whatsapp-automation/database';
import { conversationService } from '../services/conversation.service';
import {
  conversationFilterSchema,
  assignConversationSchema,
  updateConversationStatusSchema,
  addNoteSchema,
  toggleAiSchema,
} from '@whatsapp-automation/validation';
import {
  authenticate,
  requireWorkspace,
  requirePermission,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { PERMISSIONS, ERROR_CODES } from '@whatsapp-automation/shared';

export async function conversationRoutes(server: FastifyInstance) {
  // All routes require authentication and workspace context
  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  // List conversations
  server.get(
    '/',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_VIEW)] },
    async (request: AuthenticatedRequest, reply) => {
      const filters = conversationFilterSchema.parse(request.query);
      
      const result = await conversationService.getConversations(
        request.workspaceId!,
        filters
      );
      
      return reply.send({
        success: true,
        data: result.conversations,
        meta: result.meta,
      });
    }
  );

  // Get conversation
  server.get(
    '/:conversationId',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_VIEW)] },
    async (request: AuthenticatedRequest, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      
      const conversation = await conversationService.getConversation(
        request.workspaceId!,
        conversationId
      );
      
      return reply.send({
        success: true,
        data: { conversation },
      });
    }
  );

  // Update conversation status
  server.patch(
    '/:conversationId/status',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_CLOSE)] },
    async (request: AuthenticatedRequest, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const { status } = updateConversationStatusSchema.parse(request.body);
      
      const conversation = await conversationService.updateConversationStatus(
        request.workspaceId!,
        conversationId,
        status
      );
      
      return reply.send({
        success: true,
        data: { conversation },
      });
    }
  );

  // Assign conversation
  server.post(
    '/:conversationId/assign',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_ASSIGN)] },
    async (request: AuthenticatedRequest, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const { userId } = assignConversationSchema.parse(request.body);
      
      const assignment = await conversationService.assignConversation(
        request.workspaceId!,
        conversationId,
        userId,
        request.user!.id
      );
      
      return reply.send({
        success: true,
        data: { assignment },
      });
    }
  );

  // Toggle AI
  server.patch(
    '/:conversationId/ai',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_REPLY)] },
    async (request: AuthenticatedRequest, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const { isAiEnabled } = toggleAiSchema.parse(request.body);
      
      const conversation = await conversationService.toggleAi(
        request.workspaceId!,
        conversationId,
        isAiEnabled
      );
      
      return reply.send({
        success: true,
        data: { conversation },
      });
    }
  );

  // Add note
  server.post(
    '/:conversationId/notes',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_VIEW)] },
    async (request: AuthenticatedRequest, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const { content } = addNoteSchema.parse(request.body);
      
      const note = await conversationService.addNote(
        request.workspaceId!,
        conversationId,
        request.user!.id,
        content
      );
      
      return reply.status(201).send({
        success: true,
        data: { note },
      });
    }
  );

  // Start or get existing conversation for a contact
  server.post(
    '/start',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_REPLY)] },
    async (request: AuthenticatedRequest, reply) => {
      const { contactId } = request.body as { contactId: string };
      const workspaceId = request.workspaceId!;

      const contact = await prisma.contact.findFirst({
        where: { id: contactId, workspaceId },
      });

      if (!contact) {
        return reply.status(404).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Contact not found' },
        });
      }

      let conv = await prisma.conversation.findFirst({
        where: { workspaceId, contactId },
      });

      if (!conv) {
        const account = await prisma.whatsAppAccount.findFirst({
          where: { isConnected: true },
        });

        if (!account) {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.WHATSAPP_NOT_CONNECTED, message: 'No active WhatsApp account connected' },
          });
        }

        conv = await prisma.conversation.create({
          data: {
            workspaceId,
            contactId,
            whatsappAccountId: account.id,
            status: 'OPEN',
            priority: 'NORMAL',
            isAiEnabled: true,
            lastMessageAt: new Date(),
          },
        });
      }

      return reply.send({
        success: true,
        data: { conversation: conv },
      });
    }
  );

  // Send message
  server.post(
    '/:conversationId/messages',
    { preHandler: [requirePermission(PERMISSIONS.CONVERSATION_REPLY)] },
    async (request: AuthenticatedRequest, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const bodySchema = z.object({
        content: z.string().min(1),
        type: z.enum(['TEXT', 'IMAGE', 'DOCUMENT']).default('TEXT'),
      });
      const { content, type } = bodySchema.parse(request.body);

      const message = await conversationService.sendMessage(
        request.workspaceId!,
        conversationId,
        request.user!.id,
        content,
        type
      );

      return reply.status(201).send({
        success: true,
        data: { message },
      });
    }
  );
}
