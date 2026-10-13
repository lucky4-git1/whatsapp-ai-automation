import { FastifyInstance } from 'fastify';
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
import { PERMISSIONS } from '@whatsapp-automation/shared';

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
}
