import { logger } from '@whatsapp-automation/observability';
import type { WhatsAppWebhookPayload } from '@whatsapp-automation/shared';
import type {
  InboundMessage,
  MessageStatusUpdate,
  ContactProfile,
} from '../types';

export interface ProcessedWebhookEvent {
  type: 'message' | 'status' | 'unknown';
  phoneNumberId: string;
  businessAccountId: string;
  message?: {
    data: InboundMessage;
    contact: ContactProfile;
  };
  status?: MessageStatusUpdate;
  raw: any;
}

/**
 * WhatsApp Webhook Event Handler
 * 
 * Parses and normalizes webhook events from Meta
 */
export class WebhookHandler {
  /**
   * Process webhook payload and extract events
   */
  processWebhook(payload: WhatsAppWebhookPayload): ProcessedWebhookEvent[] {
    const events: ProcessedWebhookEvent[] = [];

    try {
      if (payload.object !== 'whatsapp_business_account') {
        logger.warn({ object: payload.object }, 'Unexpected webhook object type');
        return events;
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'messages') {
            continue;
          }

          const value = change.value;
          const phoneNumberId = value.metadata.phone_number_id;
          const businessAccountId = entry.id;

          // Process inbound messages
          if (value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              const contact = value.contacts?.find((c) => c.wa_id === msg.from);
              
              events.push({
                type: 'message',
                phoneNumberId,
                businessAccountId,
                message: {
                  data: this.normalizeInboundMessage(msg),
                  contact: contact
                    ? { name: contact.profile.name, wa_id: contact.wa_id }
                    : { name: '', wa_id: msg.from },
                },
                raw: msg,
              });
            }
          }

          // Process status updates
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              events.push({
                type: 'status',
                phoneNumberId,
                businessAccountId,
                status: this.normalizeStatusUpdate(status),
                raw: status,
              });
            }
          }
        }
      }

      logger.info({ eventCount: events.length }, 'Processed webhook events');
    } catch (error) {
      logger.error({ error, payload }, 'Failed to process webhook payload');
    }

    return events;
  }

  /**
   * Normalize inbound message to standard format
   */
  private normalizeInboundMessage(msg: any): InboundMessage {
    const normalized: InboundMessage = {
      messageId: msg.id,
      from: msg.from,
      timestamp: msg.timestamp,
      type: msg.type,
    };

    // Add type-specific data
    switch (msg.type) {
      case 'text':
        normalized.text = msg.text;
        break;
      case 'image':
        normalized.image = msg.image;
        break;
      case 'document':
        normalized.document = msg.document;
        break;
      case 'audio':
        normalized.audio = msg.audio;
        break;
      case 'video':
        normalized.video = msg.video;
        break;
      case 'location':
        normalized.location = msg.location;
        break;
      case 'interactive':
        normalized.interactive = msg.interactive;
        break;
    }

    // Add context if message is a reply
    if (msg.context) {
      normalized.context = msg.context;
    }

    return normalized;
  }

  /**
   * Normalize status update to standard format
   */
  private normalizeStatusUpdate(status: any): MessageStatusUpdate {
    return {
      messageId: status.id,
      status: status.status,
      timestamp: status.timestamp,
      recipientId: status.recipient_id,
      errors: status.errors || [],
    };
  }

  /**
   * Extract idempotency key from webhook event
   * 
   * Use message ID or status update ID to prevent duplicate processing
   */
  getIdempotencyKey(event: ProcessedWebhookEvent): string {
    if (event.type === 'message' && event.message) {
      return `msg:${event.message.data.messageId}`;
    }
    if (event.type === 'status' && event.status) {
      return `status:${event.status.messageId}:${event.status.status}:${event.status.timestamp}`;
    }
    return `unknown:${Date.now()}:${Math.random()}`;
  }

  /**
   * Validate webhook event structure
   */
  isValidEvent(event: ProcessedWebhookEvent): boolean {
    if (!event.phoneNumberId || !event.businessAccountId) {
      logger.warn('Event missing required identifiers');
      return false;
    }

    if (event.type === 'message') {
      if (!event.message?.data.messageId || !event.message?.data.from) {
        logger.warn('Invalid message event structure');
        return false;
      }
    }

    if (event.type === 'status') {
      if (!event.status?.messageId || !event.status?.status) {
        logger.warn('Invalid status event structure');
        return false;
      }
    }

    return true;
  }

  /**
   * Check if message is from business (not customer)
   * 
   * These should typically be ignored to prevent loops
   */
  isBusinessMessage(event: ProcessedWebhookEvent): boolean {
    // Messages from the business will have specific indicators
    // This is a safety check to prevent processing own messages
    return false; // Implement based on your business logic
  }
}
