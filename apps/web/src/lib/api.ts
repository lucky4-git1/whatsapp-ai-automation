import axios from 'axios';

// When VITE_API_URL is omitted or empty, relative requests go through Vite's /api proxy
const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add workspace ID if available
    const workspaceId = localStorage.getItem('workspaceId');
    if (workspaceId) {
      config.headers['X-Workspace-Id'] = workspaceId;
    }

    // Clean query params so empty strings don't fail enum validations
    if (config.params && typeof config.params === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [key, val] of Object.entries(config.params)) {
        if (val !== '' && val !== null && val !== undefined) {
          cleaned[key] = val;
        }
      }
      config.params = cleaned;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Do not redirect on login or register endpoints - let UI handle the error toast
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API response type
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

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => api.post<ApiResponse>('/api/v1/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse>('/api/v1/auth/login', data),

  me: () => api.get<ApiResponse>('/api/v1/auth/me'),

  logout: () => api.post<ApiResponse>('/api/v1/auth/logout'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse>('/api/v1/auth/change-password', data),
};

// Workspace API
export const workspaceApi = {
  list: () => api.get<ApiResponse>('/api/v1/workspaces'),

  get: (id: string) => api.get<ApiResponse>(`/api/v1/workspaces/${id}`),

  create: (data: any) => api.post<ApiResponse>('/api/v1/workspaces', data),

  update: (id: string, data: any) =>
    api.patch<ApiResponse>(`/api/v1/workspaces/${id}`, data),

  members: (id: string) =>
    api.get<ApiResponse>(`/api/v1/workspaces/${id}/members`),

  inviteMember: (id: string, data: any) =>
    api.post<ApiResponse>(`/api/v1/workspaces/${id}/members`, data),

  removeMember: (id: string, membershipId: string) =>
    api.delete<ApiResponse>(`/api/v1/workspaces/${id}/members/${membershipId}`),
};

// Contact API
export const contactApi = {
  list: (params?: any) =>
    api.get<ApiResponse>('/api/v1/contacts', { params }),

  get: (id: string) => api.get<ApiResponse>(`/api/v1/contacts/${id}`),

  create: (data: any) => api.post<ApiResponse>('/api/v1/contacts', data),

  update: (id: string, data: any) =>
    api.patch<ApiResponse>(`/api/v1/contacts/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse>(`/api/v1/contacts/${id}`),

  import: (contacts: any[]) =>
    api.post<ApiResponse>('/api/v1/contacts/import', { contacts }),

  export: () =>
    api.get<ApiResponse>('/api/v1/contacts/export'),
};

// Campaign API
export const campaignApi = {
  list: () => api.get<ApiResponse>('/api/v1/campaigns'),
  get: (id: string) => api.get<ApiResponse>(`/api/v1/campaigns/${id}`),
  create: (data: any) => api.post<ApiResponse>('/api/v1/campaigns', data),
  launch: (id: string) => api.post<ApiResponse>(`/api/v1/campaigns/${id}/launch`),
  pause: (id: string) => api.post<ApiResponse>(`/api/v1/campaigns/${id}/pause`),
  resume: (id: string) => api.post<ApiResponse>(`/api/v1/campaigns/${id}/resume`),
  cancel: (id: string) => api.post<ApiResponse>(`/api/v1/campaigns/${id}/cancel`),
};

// Analytics API
export const analyticsApi = {
  getOverview: () => api.get<ApiResponse>('/api/v1/analytics/overview'),
};

// Conversation API
export const conversationApi = {
  list: (params?: any) =>
    api.get<ApiResponse>('/api/v1/conversations', { params }),

  start: (contactId: string) =>
    api.post<ApiResponse>('/api/v1/conversations/start', { contactId }),

  get: (id: string) => api.get<ApiResponse>(`/api/v1/conversations/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse>(`/api/v1/conversations/${id}/status`, { status }),

  assign: (id: string, userId: string) =>
    api.post<ApiResponse>(`/api/v1/conversations/${id}/assign`, { userId }),

  toggleAi: (id: string, isAiEnabled: boolean) =>
    api.patch<ApiResponse>(`/api/v1/conversations/${id}/ai`, { isAiEnabled }),

  addNote: (id: string, content: string) =>
    api.post<ApiResponse>(`/api/v1/conversations/${id}/notes`, { content }),

  sendMessage: (id: string, content: string, type: string = 'TEXT') =>
    api.post<ApiResponse>(`/api/v1/conversations/${id}/messages`, { content, type }),
};

// WhatsApp API
export const whatsappApi = {
  listAccounts: () => api.get<ApiResponse>('/api/v1/whatsapp/accounts'),

  getAccount: (id: string) =>
    api.get<ApiResponse>(`/api/v1/whatsapp/accounts/${id}`),

  connectAccount: (data: any) =>
    api.post<ApiResponse>('/api/v1/whatsapp/accounts', data),

  disconnectAccount: (id: string) =>
    api.delete<ApiResponse>(`/api/v1/whatsapp/accounts/${id}`),

  syncTemplates: (id: string) =>
    api.post<ApiResponse>(`/api/v1/whatsapp/accounts/${id}/sync-templates`),

  getTemplates: (id: string) =>
    api.get<ApiResponse>(`/api/v1/whatsapp/accounts/${id}/templates`),

  healthCheck: (id: string) =>
    api.get<ApiResponse>(`/api/v1/whatsapp/accounts/${id}/health`),

  testMessage: (id: string, recipientPhone: string, message?: string) =>
    api.post<ApiResponse>(`/api/v1/whatsapp/accounts/${id}/test-message`, { recipientPhone, message }),
};

// AI Copilot API
export const aiApi = {
  generateResponse: (conversationId: string, message?: string) =>
    api.post<ApiResponse>('/api/v1/ai/generate-response', { conversationId, message }),

  detectLanguage: (text: string) =>
    api.post<ApiResponse>('/api/v1/ai/detect-language', { text }),

  generateCopy: (data: { objective?: string; tone?: string; product?: string; language?: string }) =>
    api.post<ApiResponse>('/api/v1/ai/generate-copy', data),

  translateTelugu: (text: string, targetLanguage?: string) =>
    api.post<ApiResponse>('/api/v1/ai/translate-telugu', { text, targetLanguage }),

  rewrite: (text: string, tone?: string) =>
    api.post<ApiResponse>('/api/v1/ai/rewrite', { text, tone }),

  healthCheck: () =>
    api.get<ApiResponse>('/api/v1/ai/health'),
};

// Workflow API
export const workflowApi = {
  list: () => api.get<ApiResponse>('/api/v1/workflows'),
  get: (id: string) => api.get<ApiResponse>(`/api/v1/workflows/${id}`),
  create: (data: any) => api.post<ApiResponse>('/api/v1/workflows', data),
  update: (id: string, data: any) => api.patch<ApiResponse>(`/api/v1/workflows/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/api/v1/workflows/${id}`),
  toggle: (id: string) => api.post<ApiResponse>(`/api/v1/workflows/${id}/toggle`),
  execute: (id: string, initialData?: any) => api.post<ApiResponse>(`/api/v1/workflows/${id}/execute`, { initialData }),
};


