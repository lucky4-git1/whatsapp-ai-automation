/**
 * AI Processing Worker
 * Generates AI responses asynchronously
 */

import { Job } from 'bullmq';
import { prisma } from '@whatsapp-automation/database';
import { logger } from '@whatsapp-automation/observability';
import { aiConversationService } from '../../../api/src/services/ai-conversation.service';
import { messageSendingQueue } from '../queues';

interface AIProcessingJobData {
  conversationId: string;
  messageId: string;
  messageContent: string;
}

export async function processAI(job: Job<AIProcessingJobData>) {
  const { conversationId, messageContent } = job.data;

  try {
    logger.info({ jobId: job.id, conversationId }, 'Processing AI response');

    // Get conversation workspace
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { workspaceId: true, isAiEnabled: true },
    });

    if (!conversation || !conversation.isAiEnabled) {
      return { skipped: true, reason: 'AI not enabled' };
    }

    // Generate AI response
    const aiResponse = await aiConversationService.generateResponse(
      conversation.workspaceId,
      conversationId,
      messageContent
    );

    if (!aiResponse) {
      return { skipped: true, reason: 'AI service unavailable' };
    }

    // Create outbound message
    const outboundMessage = await prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: aiResponse.message,
        type: 'TEXT',
        status: 'PENDING',
        metadata: {
          isAiGenerated: true,
          confidence: aiResponse.confidence,
          usedKnowledgeBase: aiResponse.usedKnowledgeBase,
          sources: aiResponse.sources?.map(s => ({
            title: s.title,
            relevance: s.relevanceScore,
          })),
        },
      },
    });

    // Queue message for sending
    await messageSendingQueue.add(
      'send-message',
      {
        messageId: outboundMessage.id,
        conversationId,
        content: aiResponse.message,
        type: 'TEXT',
      },
      { priority: 5 }
    );

    logger.info(
      {
        conversationId,
        messageId: outboundMessage.id,
        confidence: aiResponse.confidence,
      },
      'AI response generated and queued'
    );

    return {
      success: true,
      messageId: outboundMessage.id,
      confidence: aiResponse.confidence,
    };
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to process AI response');
    throw error;
  }
}
