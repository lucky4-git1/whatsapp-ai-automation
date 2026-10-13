import { prisma } from '@whatsapp-automation/database';
import { ERROR_CODES } from '@whatsapp-automation/shared';
import { logger } from '@whatsapp-automation/observability';
import {
  CloudApiProvider,
  WebhookHandler,
  WebhookSignatureValidator,
} from '@whatsapp-automation/whatsapp-provider';
import type { ProcessedWebhookEvent } from '@whatsapp-automation/whatsapp-provider';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

export class WhatsAppService {
  private webhookHandler = new WebhookHandler();

  /**
   * Connect a WhatsApp account
   */
  async connectAccount(workspaceId: string, data: {
    name: string;
    businessAccountId: string;
    phoneNumberId: string;
    phoneNumber: string;
    accessToken: string;
    webhookSecret?: string;
  }) {
    // Check if account already exists
    const existing = await prisma.whatsAppAccount.findFirst({
      where: {
        businessAccountId: data.businessAccountId,
        phoneNumberId: data.phoneNumberId,
      },
    });

    if (existing) {
      throw {
        statusCode: 409,
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'WhatsApp account already connected',
      };
    }

    // Initialize provider and verify connection
    const provider = new CloudApiProvider();
    try {
      await provider.initialize({
        apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
        graphApiUrl: process.env.WHATSAPP_GRAPH_API_URL || 'https://graph.facebook.com',
        phoneNumberId: data.phoneNumberId,
        businessAccountId: data.businessAccountId,
        accessToken: data.accessToken,
        webhookSecret: data.webhookSecret,
      });

      // Verify connection by fetching phone number info
      const phoneInfo = await provider.getPhoneNumberInfo();

      // Encrypt access token
      const encryptedToken = this.encryptCredentials(data.accessToken);

      // Create WhatsApp account record
      const account = await prisma.whatsAppAccount.create({
        data: {
          workspaceId,
          name: data.name,
          businessAccountId: data.businessAccountId,
          phoneNumberId: data.phoneNumberId,
          phoneNumber: data.phoneNumber,
          displayPhoneNumber: phoneInfo.displayPhoneNumber,
          verifiedName: phoneInfo.verifiedName,
          qualityRating: phoneInfo.qualityRating,
          status: 'CONNECTED',
          isConnected: true,
          credentialsEncrypted: encryptedToken,
          webhookSecret: data.webhookSecret,
          lastSyncAt: new Date(),
        },
      });

      return account;
    } catch (error) {
      logger.error({ error, data: { phoneNumberId: data.phoneNumberId } }, 'Failed to connect WhatsApp account');
      
      throw {
        statusCode: 400,
        code: ERROR_CODES.WHATSAPP_API_ERROR,
        message: 'Failed to verify WhatsApp connection',
        details: error,
      };
    }
  }

  /**
   * Get provider instance for a WhatsApp account
   */
  async getProvider(accountId: string): Promise<CloudApiProvider> {
    const account = await prisma.whatsAppAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'WhatsApp account not found',
      };
    }

    if (!account.isConnected) {
      throw {
        statusCode: 400,
        code: ERROR_CODES.WHATSAPP_NOT_CONNECTED,
        message: 'WhatsApp account is not connected',
      };
    }

    if (!account.credentialsEncrypted) {
      throw {
        statusCode: 400,
        code: ERROR_CODES.WHATSAPP_NOT_CONNECTED,
        message: 'WhatsApp credentials not configured',
      };
    }

    const accessToken = this.decryptCredentials(account.credentialsEncrypted);

    const provider = new CloudApiProvider();
    await provider.initialize({
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
      graphApiUrl: process.env.WHATSAPP_GRAPH_API_URL || 'https://graph.facebook.com',
      phoneNumberId: account.phoneNumberId,
      businessAccountId: account.businessAccountId,
      accessToken,
      webhookSecret: account.webhookSecret || undefined,
    });

    return provider;
  }

  /**
   * Disconnect WhatsApp account
   */
  async disconnectAccount(workspaceId: string, accountId: string) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: {
        id: accountId,
        workspaceId,
      },
    });

    if (!account) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'WhatsApp account not found',
      };
    }

    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: {
        status: 'DISCONNECTED',
        isConnected: false,
        credentialsEncrypted: null,
      },
    });
  }

  /**
   * Sync message templates
   */
  async syncTemplates(workspaceId: string, accountId: string) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: {
        id: accountId,
        workspaceId,
      },
    });

    if (!account) {
      throw {
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'WhatsApp account not found',
      };
    }

    const provider = await this.getProvider(accountId);
    const templates = await provider.getTemplates();

    // Upsert templates
    for (const template of templates) {
      await prisma.messageTemplate.upsert({
        where: {
          whatsappAccountId_name_language: {
            whatsappAccountId: accountId,
            name: template.name,
            language: template.language,
          },
        },
        create: {
          workspaceId,
          whatsappAccountId: accountId,
          externalId: template.id,
          name: template.name,
          category: template.category as any,
          language: template.language,
          status: template.status as any,
          components: template.components,
          rejectionReason: template.rejectedReason,
          lastSyncedAt: new Date(),
        },
        update: {
          externalId: template.id,
          status: template.status as any,
          components: template.components,
          rejectionReason: template.rejectedReason,
          lastSyncedAt: new Date(),
        },
      });
    }

    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    });

    return templates;
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(eventId: string): Promise<void> {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      logger.error({ eventId }, 'Webhook event not found');
      return;
    }

    if (event.isProcessed) {
      logger.debug({ eventId }, 'Event already processed');
      return;
    }

    try {
      const events = this.webhookHandler.processWebhook(event.payload as any);

      for (const webhookEvent of events) {
        if (!this.webhookHandler.isValidEvent(webhookEvent)) {
          logger.warn({ webhookEvent }, 'Invalid webhook event');
          continue;
        }

        if (webhookEvent.type === 'message') {
          await this.handleInboundMessage(webhookEvent);
        } else if (webhookEvent.type === 'status') {
          await this.handleStatusUpdate(webhookEvent);
        }
      }

      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error({ error, eventId }, 'Failed to process webhook event');
      
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          attemptCount: { increment: 1 },
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Handle inbound message
   */
  private async handleInboundMessage(event: ProcessedWebhookEvent) {
    if (!event.message) return;

    const { data: message, contact } = event.message;

    // Find WhatsApp account
    const account = await prisma.whatsAppAccount.findFirst({
      where: {
        phoneNumberId: event.phoneNumberId,
      },
    });

    if (!account) {
      logger.warn({ phoneNumberId: event.phoneNumberId }, 'WhatsApp account not found for inbound message');
      return;
    }

    // Find or create contact
    const normalizedPhone = message.from;
    let dbContact = await prisma.contact.findFirst({
      where: {
        workspaceId: account.workspaceId,
        phoneNumber: normalizedPhone,
      },
    });

    if (!dbContact) {
      dbContact = await prisma.contact.create({
        data: {
          workspaceId: account.workspaceId,
          phoneNumber: normalizedPhone,
          name: contact.name || null,
          source: 'WHATSAPP',
          lastInteractionAt: new Date(),
        },
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: account.workspaceId,
        whatsappAccountId: account.id,
        contactId: dbContact.id,
        status: { notIn: ['RESOLVED', 'ARCHIVED'] },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: account.workspaceId,
          whatsappAccountId: account.id,
          contactId: dbContact.id,
          status: 'OPEN',
          lastMessageAt: new Date(),
        },
      });
    }

    // Create message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        whatsappAccountId: account.id,
        externalId: message.messageId,
        direction: 'INBOUND',
        messageType: message.type.toUpperCase() as any,
        content: message.text?.body || null,
        metadata: message,
        status: 'DELIVERED',
        deliveredAt: new Date(message.timestamp),
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

    // Update contact
    await prisma.contact.update({
      where: { id: dbContact.id },
      data: {
        lastInteractionAt: new Date(),
        name: contact.name || dbContact.name,
      },
    });

    logger.info({
      conversationId: conversation.id,
      messageId: message.messageId,
    }, 'Inbound message processed');
  }

  /**
   * Handle message status update
   */
  private async handleStatusUpdate(event: ProcessedWebhookEvent) {
    if (!event.status) return;

    const status = event.status;

    // Find message
    const message = await prisma.message.findFirst({
      where: {
        externalId: status.messageId,
      },
    });

    if (!message) {
      logger.warn({ messageId: status.messageId }, 'Message not found for status update');
      return;
    }

    // Map status
    const mappedStatus = this.mapMessageStatus(status.status);

    // Update message
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: mappedStatus,
        deliveredAt: status.status === 'delivered' ? new Date(status.timestamp) : message.deliveredAt,
        readAt: status.status === 'read' ? new Date(status.timestamp) : message.readAt,
        failedAt: status.status === 'failed' ? new Date(status.timestamp) : message.failedAt,
        errorMessage: status.errors && status.errors.length > 0 ? status.errors[0].message : null,
      },
    });

    // Create status event
    await prisma.messageStatusEvent.create({
      data: {
        messageId: message.id,
        status: mappedStatus,
        timestamp: new Date(status.timestamp),
        errorMessage: status.errors && status.errors.length > 0 ? status.errors[0].message : null,
        metadata: status.errors,
      },
    });

    logger.info({
      messageId: message.id,
      status: mappedStatus,
    }, 'Message status updated');
  }

  private mapMessageStatus(status: string) {
    const statusMap: Record<string, any> = {
      'sent': 'SENT',
      'delivered': 'DELIVERED',
      'read': 'READ',
      'failed': 'FAILED',
    };
    return statusMap[status] || 'SENT';
  }

  private encryptCredentials(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptCredentials(encrypted: string): string {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

export const whatsappService = new WhatsAppService();
