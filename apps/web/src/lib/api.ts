import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
};

// Conversation API
export const conversationApi = {
  list: (params?: any) =>
    api.get<ApiResponse>('/api/v1/conversations', { params }),

  get: (id: string) => api.get<ApiResponse>(`/api/v1/conversations/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse>(`/api/v1/conversations/${id}/status`, { status }),

  assign: (id: string, userId: string) =>
    api.post<ApiResponse>(`/api/v1/conversations/${id}/assign`, { userId }),

  toggleAi: (id: string, isAiEnabled: boolean) =>
    api.patch<ApiResponse>(`/api/v1/conversations/${id}/ai`, { isAiEnabled }),

  addNote: (id: string, content: string) =>
    api.post<ApiResponse>(`/api/v1/conversations/${id}/notes`, { content }),
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
};
