/**
 * Message Sending Worker
 * Handles outbound message delivery via WhatsApp Cloud API
 */

import { Job } from 'bullmq';
import { prisma } from '@whatsapp-automation/database';
import { logger } from '@whatsapp-automation/observability';
import { CloudApiProvider } from '@whatsapp-automation/whatsapp-provider';

interface MessageSendingJobData {
  messageId: string;
  conversationId: string;
  content: string;
  type: 'TEXT' | 'TEMPLATE' | 'IMAGE' | 'DOCUMENT';
  templateData?: {
    name: string;
    languageCode: string;
    components?: any[];
  };
  mediaUrl?: string;
}

export async function processMessageSending(job: Job<MessageSendingJobData>) {
  const { messageId, conversationId, content, type, templateData, mediaUrl } = job.data;

  try {
    logger.info({ jobId: job.id, messageId }, 'Sending message');

    // Get conversation and account details
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            contact: true,
            whatsappAccount: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const { conversation } = message;
    const { whatsappAccount, contact } = conversation;

    // Decrypt credentials
    const provider = new CloudApiProvider();
    await provider.initialize({
      phoneNumberId: whatsappAccount.phoneNumberId,
      accessToken: whatsappAccount.accessToken, // Should decrypt in production
      businessAccountId: whatsappAccount.businessAccountId,
    });

    let response;

    // Send based on type
    switch (type) {
      case 'TEXT':
        response = await provider.sendTextMessage(contact.phoneNumber, content);
        break;

      case 'TEMPLATE':
        if (!templateData) throw new Error('Template data required');
        response = await provider.sendTemplateMessage(
          contact.phoneNumber,
          templateData.name,
          templateData.languageCode,
          templateData.components
        );
        break;

      case 'IMAGE':
        if (!mediaUrl) throw new Error('Media URL required for image');
        response = await provider.sendMediaMessage(
          contact.phoneNumber,
          'image',
          mediaUrl,
          content
        );
        break;

      case 'DOCUMENT':
        if (!mediaUrl) throw new Error('Media URL required for document');
        response = await provider.sendMediaMessage(
          contact.phoneNumber,
          'document',
          mediaUrl,
          content
        );
        break;

      default:
        throw new Error(`Unsupported message type: ${type}`);
    }

    // Update message with WhatsApp message ID
    await prisma.message.update({
      where: { id: messageId },
      data: {
        whatsappMessageId: response.messageId,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    logger.info(
      { messageId, whatsappMessageId: response.messageId },
      'Message sent successfully'
    );

    return { success: true, whatsappMessageId: response.messageId };
  } catch (error: any) {
    logger.error({ error, messageId }, 'Failed to send message');

    // Update message status to failed
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}
