/**
 * AI Routes
 * Endpoints for AI-powered conversation features
 */

import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { aiConversationService } from '../services/ai-conversation.service';
import { z } from 'zod';
import { ERROR_CODES } from '@whatsapp-automation/shared';
import { logger } from '@whatsapp-automation/observability';

// Request schemas
const generateResponseSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().optional(),
});

const addKnowledgeDocSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  language: z.enum(['en', 'te', 'hi']).default('en'),
  tags: z.array(z.string()).optional(),
});

const searchKnowledgeSchema = z.object({
  query: z.string().min(1),
  language: z.enum(['en', 'te', 'hi']).optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export async function aiRoutes(fastify: FastifyInstance) {
  // All AI routes require authentication
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Generate AI response for conversation
   * POST /ai/generate-response
   */
  fastify.post('/generate-response', async (request, reply) => {
    try {
      const body = generateResponseSchema.parse(request.body);
      const { workspaceId } = request.user;

      const response = await aiConversationService.generateResponse(
        workspaceId,
        body.conversationId,
        body.message
      );

      if (!response) {
        return reply.code(503).send({
          success: false,
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'AI service is not available',
        });
      }

      return reply.send({
        success: true,
        data: response,
      });
    } catch (error: any) {
      logger.error('Error generating AI response', { error });

      if (error.statusCode) {
        return reply.code(error.statusCode).send({
          success: false,
          code: error.code,
          message: error.message,
          details: error.details,
        });
      }

      return reply.code(500).send({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to generate AI response',
      });
    }
  });

  /**
   * Add document to knowledge base
   * POST /ai/knowledge/documents
   */
  fastify.post('/knowledge/documents', async (request, reply) => {
    try {
      const body = addKnowledgeDocSchema.parse(request.body);
      const { workspaceId } = request.user;

      const aiEngine = aiConversationService.getEngine();
      const knowledgeBase = aiEngine.getKnowledgeBase();

      const document = await knowledgeBase.upsertDocument({
        workspaceId,
        title: body.title,
        content: body.content,
        language: body.language as any,
        tags: body.tags || [],
      });

      return reply.code(201).send({
        success: true,
        data: {
          id: document.id,
          title: document.title,
          language: document.language,
          tags: document.tags,
          createdAt: document.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('Error adding knowledge document', { error });

      return reply.code(500).send({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to add knowledge document',
        details: error.message,
      });
    }
  });

  /**
   * Search knowledge base
   * POST /ai/knowledge/search
   */
  fastify.post('/knowledge/search', async (request, reply) => {
    try {
      const body = searchKnowledgeSchema.parse(request.body);
      const { workspaceId } = request.user;

      const aiEngine = aiConversationService.getEngine();
      const knowledgeBase = aiEngine.getKnowledgeBase();

      const results = await knowledgeBase.search({
        workspaceId,
        query: body.query,
        language: body.language as any,
        limit: body.limit,
      });

      return reply.send({
        success: true,
        data: results,
      });
    } catch (error: any) {
      logger.error('Error searching knowledge base', { error });

      return reply.code(500).send({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to search knowledge base',
        details: error.message,
      });
    }
  });

  /**
   * Delete knowledge document
   * DELETE /ai/knowledge/documents/:documentId
   */
  fastify.delete('/knowledge/documents/:documentId', async (request, reply) => {
    try {
      const { documentId } = request.params as { documentId: string };

      const aiEngine = aiConversationService.getEngine();
      const knowledgeBase = aiEngine.getKnowledgeBase();

      await knowledgeBase.deleteDocument(documentId);

      return reply.send({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting knowledge document', { error });

      return reply.code(500).send({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to delete document',
        details: error.message,
      });
    }
  });

  /**
   * Get AI health status
   * GET /ai/health
   */
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await aiConversationService.healthCheck();

      return reply.send({
        success: true,
        data: health,
      });
    } catch (error: any) {
      logger.error('Error checking AI health', { error });

      return reply.code(500).send({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to check AI health',
      });
    }
  });

  /**
   * Detect language from text
   * POST /ai/detect-language
   */
  fastify.post('/detect-language', async (request, reply) => {
    try {
      const { text } = request.body as { text: string };

      if (!text) {
        return reply.code(400).send({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Text is required',
        });
      }

      const aiEngine = aiConversationService.getEngine();
      const detection = aiEngine.detectLanguage(text);

      return reply.send({
        success: true,
        data: detection,
      });
    } catch (error: any) {
      logger.error('Error detecting language', { error });

      return reply.code(500).send({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to detect language',
      });
    }
  });
}
