import { create } from 'zustand';
import { authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    workspaceId: string | null;
    workspaceName?: string;
    role: string;
  }>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setWorkspace: (workspaceId: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login({ email, password });

      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Set default workspace if available
        if (user.memberships && user.memberships.length > 0) {
          const defaultWorkspace = user.memberships.find((m: any) => m.workspaceId);
          if (defaultWorkspace) {
            localStorage.setItem('workspaceId', defaultWorkspace.workspaceId);
          }
        }

        set({ user, token, isLoading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.register(data);

      if (response.data.success) {
        // Auto-login after registration
        await get().login(data.email, data.password);
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Registration failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspaceId');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await authApi.me();
      if (response.data.success && response.data.data) {
        set({ user: response.data.data.user, isLoading: false });
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isLoading: false });
    }
  },

  setWorkspace: (workspaceId: string) => {
    localStorage.setItem('workspaceId', workspaceId);
    window.location.reload();
  },
}));

// Initialize auth check on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}
