import type {
  SendMessageRequest,
  SendMessageResponse,
  MessageTemplate,
  PhoneNumberInfo,
  WhatsAppProviderConfig,
} from './types';

/**
 * WhatsApp Provider Interface
 * 
 * This interface defines the contract that all WhatsApp providers must implement.
 * It abstracts provider-specific details, allowing the application to work with
 * different WhatsApp integration providers.
 */
export interface IWhatsAppProvider {
  /**
   * Initialize the provider with configuration
   */
  initialize(config: WhatsAppProviderConfig): Promise<void>;

  /**
   * Send a message (text, template, or media)
   */
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;

  /**
   * Get available message templates
   */
  getTemplates(): Promise<MessageTemplate[]>;

  /**
   * Get a specific template by name and language
   */
  getTemplate(name: string, language: string): Promise<MessageTemplate | null>;

  /**
   * Get phone number information
   */
  getPhoneNumberInfo(): Promise<PhoneNumberInfo>;

  /**
   * Download media file by ID
   */
  downloadMedia(mediaId: string): Promise<Buffer>;

  /**
   * Upload media file
   */
  uploadMedia(file: Buffer, mimeType: string): Promise<string>;

  /**
   * Mark a message as read
   */
  markAsRead(messageId: string): Promise<void>;

  /**
   * Check provider health
   */
  healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
  }>;
}
