/**
 * Webhook Processing Worker
 * Handles incoming WhatsApp webhook events asynchronously
 */

import { Job } from 'bullmq';
import { prisma } from '@whatsapp-automation/database';
import { logger } from '@whatsapp-automation/observability';
import { WebhookHandler } from '@whatsapp-automation/whatsapp-provider';
import { aiProcessingQueue } from '../queues';

interface WebhookJobData {
  payload: any;
  signature: string;
  timestamp: number;
}

export async function processWebhook(job: Job<WebhookJobData>) {
  const { payload, timestamp } = job.data;

  try {
    logger.info({ jobId: job.id }, 'Processing webhook event');

    const handler = new WebhookHandler();
    const events = handler.processWebhook(payload);

    for (const event of events) {
      if (event.type === 'message' && event.message) {
        await handleInboundMessage(event);
      } else if (event.type === 'status' && event.status) {
        await handleStatusUpdate(event);
      }
    }

    return { processed: events.length, timestamp };
  } catch (error) {
    logger.error({ error, jobId: job.id }, 'Failed to process webhook');
    throw error;
  }
}

async function handleInboundMessage(event: any) {
  const { message, contact } = event.message;
  const { phoneNumberId } = event;

  // Find WhatsApp account
  const whatsappAccount = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId },
    include: { workspace: true },
  });

  if (!whatsappAccount) {
    logger.warn({ phoneNumberId }, 'WhatsApp account not found');
    return;
  }

  // Find or create contact
  let contactRecord = await prisma.contact.findFirst({
    where: {
      workspaceId: whatsappAccount.workspaceId,
      phoneNumber: message.from,
    },
  });

  if (!contactRecord) {
    contactRecord = await prisma.contact.create({
      data: {
        workspaceId: whatsappAccount.workspaceId,
        phoneNumber: message.from,
        name: contact.name || message.from,
        source: 'WHATSAPP',
      },
    });
  }

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: whatsappAccount.workspaceId,
      contactId: contactRecord.id,
      whatsappAccountId: whatsappAccount.id,
      status: { notIn: ['ARCHIVED'] },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: whatsappAccount.workspaceId,
        contactId: contactRecord.id,
        whatsappAccountId: whatsappAccount.id,
        status: 'OPEN',
        channel: 'WHATSAPP',
      },
    });
  }

  // Save message
  const savedMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      whatsappMessageId: message.messageId,
      direction: 'INBOUND',
      content: message.text?.body || message.type,
      type: message.type.toUpperCase(),
      status: 'RECEIVED',
      metadata: message,
    },
  });

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
    },
  });

  // Queue AI processing if enabled
  if (conversation.isAiEnabled) {
    await aiProcessingQueue.add(
      'process-message',
      {
        conversationId: conversation.id,
        messageId: savedMessage.id,
        messageContent: message.text?.body,
      },
      { priority: 10 }
    );
  }

  logger.info(
    { conversationId: conversation.id, messageId: savedMessage.id },
    'Inbound message saved'
  );
}

async function handleStatusUpdate(event: any) {
  const { status } = event;

  await prisma.message.updateMany({
    where: { whatsappMessageId: status.messageId },
    data: {
      status: status.status.toUpperCase(),
      metadata: status,
    },
  });

  logger.info({ messageId: status.messageId, status: status.status }, 'Message status updated');
}
