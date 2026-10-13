// Common types shared across the application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

export type Language = 'en' | 'te' | 'hi';

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
  image?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  document?: {
    link?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: any;
          document?: any;
          audio?: any;
          video?: any;
          location?: any;
          interactive?: any;
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: any[];
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface WorkflowNodeConfig {
  nodeType: string;
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowExecutionContext {
  conversationId?: string;
  contactId?: string;
  variables: Record<string, any>;
  previousNodes: string[];
}

export interface AiToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface AiResponse {
  text: string;
  confidence: number;
  intent?: string;
  language?: Language;
  toolCalls?: AiToolCall[];
  shouldEscalate?: boolean;
  sources?: string[];
}

export interface CampaignAudienceFilter {
  tags?: string[];
  excludeTags?: string[];
  lifecycleStage?: string[];
  consentStatus?: string[];
  customFilters?: Record<string, any>;
}
