import { create } from 'zustand';
import { useChatStore } from './useChatStore';

interface AuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  loading: false,
  error: null,

  init: () => {
    // Mock initialization
    set({ loading: false });
  },

  login: async () => {
    // Mock login
    set({ loading: true });
    setTimeout(() => {
      set({ 
        user: { displayName: 'Guest User', email: 'guest@example.com' }, 
        loading: false 
      });
    }, 500);
  },

  logout: async () => {
    set({ loading: true });
    setTimeout(() => {
      set({ user: null, loading: false });
      useChatStore.getState().clearAllSessions();
    }, 300);
  },
}));
