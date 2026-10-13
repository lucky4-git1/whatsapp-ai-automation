import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@whatsapp-automation/observability';
import type { IWhatsAppProvider } from '../provider.interface';
import type {
  WhatsAppProviderConfig,
  SendMessageRequest,
  SendMessageResponse,
  MessageTemplate,
  PhoneNumberInfo,
  ProviderError,
} from '../types';

/**
 * Meta WhatsApp Business Cloud API Provider
 * 
 * Official implementation using Meta's Graph API
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class CloudApiProvider implements IWhatsAppProvider {
  private config!: WhatsAppProviderConfig;
  private client!: AxiosInstance;

  async initialize(config: WhatsAppProviderConfig): Promise<void> {
    this.config = config;

    this.client = axios.create({
      baseURL: `${config.graphApiUrl}/${config.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({
          msg: 'WhatsApp API request',
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error(error, 'WhatsApp API request error');
        return Promise.reject(error);
      }
    );

    // Add response logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({
          msg: 'WhatsApp API response',
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );

    logger.info('CloudApiProvider initialized');
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: request.to,
        type: request.type,
      };

      switch (request.type) {
        case 'text':
          payload.text = request.text;
          break;
        case 'template':
          payload.template = request.template;
          break;
        case 'image':
          payload.image = request.image;
          break;
        case 'document':
          payload.document = request.document;
          break;
        case 'audio':
          payload.audio = request.audio;
          break;
        case 'video':
          payload.video = request.video;
          break;
      }

      const response = await this.client.post(
        `/${this.config.phoneNumberId}/messages`,
        payload
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      const providerError = this.mapError(error);
      
      logger.error({
        error: providerError,
        request,
      }, 'Failed to send WhatsApp message');

      return {
        success: false,
        error: {
          code: providerError.code,
          message: providerError.message,
          details: providerError.details,
        },
      };
    }
  }

  async getTemplates(): Promise<MessageTemplate[]> {
    try {
      const response = await this.client.get(
        `/${this.config.businessAccountId}/message_templates`,
        {
          params: {
            fields: 'id,name,category,language,status,components,rejected_reason',
            limit: 100,
          },
        }
      );

      return response.data.data.map((template: any) => ({
        id: template.id,
        name: template.name,
        category: template.category,
        language: template.language,
        status: template.status,
        components: template.components || [],
        rejectedReason: template.rejected_reason,
      }));
    } catch (error) {
      logger.error(error, 'Failed to fetch message templates');
      throw this.mapError(error);
    }
  }

  async getTemplate(name: string, language: string): Promise<MessageTemplate | null> {
    try {
      const templates = await this.getTemplates();
      return templates.find(
        (t) => t.name === name && t.language === language
      ) || null;
    } catch (error) {
      logger.error({ error, name, language }, 'Failed to get template');
      return null;
    }
  }

  async getPhoneNumberInfo(): Promise<PhoneNumberInfo> {
    try {
      const response = await this.client.get(
        `/${this.config.phoneNumberId}`,
        {
          params: {
            fields: 'id,verified_name,display_phone_number,quality_rating',
          },
        }
      );

      return {
        id: response.data.id,
        verifiedName: response.data.verified_name,
        displayPhoneNumber: response.data.display_phone_number,
        qualityRating: response.data.quality_rating,
      };
    } catch (error) {
      logger.error(error, 'Failed to fetch phone number info');
      throw this.mapError(error);
    }
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      // First, get the media URL
      const mediaResponse = await this.client.get(`/${mediaId}`);
      const mediaUrl = mediaResponse.data.url;

      // Then download the media file
      const fileResponse = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(fileResponse.data);
    } catch (error) {
      logger.error({ error, mediaId }, 'Failed to download media');
      throw this.mapError(error);
    }
  }

  async uploadMedia(file: Buffer, mimeType: string): Promise<string> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', file, {
        contentType: mimeType,
      });

      const response = await this.client.post(
        `/${this.config.phoneNumberId}/media`,
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      return response.data.id;
    } catch (error) {
      logger.error({ error, mimeType }, 'Failed to upload media');
      throw this.mapError(error);
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client.post(`/${this.config.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (error) {
      logger.error({ error, messageId }, 'Failed to mark message as read');
      // Don't throw - this is a non-critical operation
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      await this.getPhoneNumberInfo();
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private handleApiError(error: AxiosError): void {
    if (error.response) {
      logger.error({
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      }, 'WhatsApp API error response');
    } else if (error.request) {
      logger.error('No response received from WhatsApp API');
    } else {
      logger.error({ error: error.message }, 'WhatsApp API request setup error');
    }
  }

  private mapError(error: any): ProviderError {
    if (axios.isAxiosError(error) && error.response) {
      const data = error.response.data as any;
      const errorData = data.error || {};

      // Map common WhatsApp error codes
      const code = this.mapErrorCode(errorData.code, errorData.error_subcode);
      const retryable = this.isRetryableError(error.response.status, errorData.code);

      return {
        code,
        message: errorData.message || error.message,
        statusCode: error.response.status,
        retryable,
        details: {
          errorSubcode: errorData.error_subcode,
          errorData: errorData.error_data,
          type: errorData.type,
          fbtrace_id: data.error?.fbtrace_id,
        },
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      statusCode: 500,
      retryable: false,
    };
  }

  private mapErrorCode(code?: number, subcode?: number): string {
    // Rate limiting
    if (code === 4 || code === 80007) return 'RATE_LIMIT_EXCEEDED';
    
    // Authentication
    if (code === 190 || code === 102) return 'INVALID_ACCESS_TOKEN';
    
    // Message errors
    if (code === 131026) return 'MESSAGE_UNDELIVERABLE';
    if (code === 131047) return 'RE_ENGAGEMENT_MESSAGE_REQUIRED';
    if (code === 131051) return 'UNSUPPORTED_MESSAGE_TYPE';
    if (code === 131052) return 'MEDIA_DOWNLOAD_ERROR';
    if (code === 131053) return 'MEDIA_UPLOAD_ERROR';
    
    // Template errors
    if (code === 132000) return 'TEMPLATE_PARAM_COUNT_MISMATCH';
    if (code === 132001) return 'TEMPLATE_DOES_NOT_EXIST';
    if (code === 132005) return 'TEMPLATE_HYDRATED_TEXT_TOO_LONG';
    if (code === 132007) return 'TEMPLATE_FORMAT_CHARACTER_POLICY_VIOLATED';
    if (code === 132015) return 'TEMPLATE_PAUSED';
    if (code === 132016) return 'TEMPLATE_DISABLED';
    
    // Account errors
    if (code === 133000) return 'PHONE_NUMBER_NOT_VERIFIED';
    if (code === 133004) return 'ACCOUNT_RESTRICTED';
    if (code === 133005) return 'ACCOUNT_FLAGGED';
    if (code === 133006) return 'ACCOUNT_BANNED';
    
    // Recipient errors
    if (code === 131031) return 'RECIPIENT_INVALID';
    if (code === 135000) return 'GENERIC_USER_ERROR';
    
    return `PROVIDER_ERROR_${code}`;
  }

  private isRetryableError(statusCode: number, errorCode?: number): boolean {
    // Rate limits and temporary server errors are retryable
    if (statusCode === 429 || statusCode === 503) return true;
    if (statusCode >= 500 && statusCode < 600) return true;
    
    // Specific error codes that are retryable
    const retryableCodes = [4, 80007, 131052]; // Rate limit, media download
    if (errorCode && retryableCodes.includes(errorCode)) return true;
    
    return false;
  }
}
