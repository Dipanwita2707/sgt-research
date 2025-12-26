import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, User } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => {
        console.log('AuthStore - setUser called with:', user);
        set({ user, isAuthenticated: !!user, isLoading: false });
      },

      login: async (username, password) => {
        console.log('AuthStore - login started');
        try {
          const response = await authService.login({ username, password });
          console.log('AuthStore - login response:', response);
          set({ user: response.user, isAuthenticated: true, isLoading: false });
          console.log('AuthStore - state after login:', get());
        } catch (error) {
          console.error('AuthStore - login error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        console.log('AuthStore - logout');
        try {
          await authService.logout();
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkAuth: async () => {
        const state = get();
        // If we already have user data from persisted state, trust it
        // The ProtectedRoute components will handle validation on navigation
        if (state.user && state.isAuthenticated) {
          console.log('AuthStore - Using persisted auth state for user:', state.user.username);
          set({ isLoading: false });
          return;
        }
        
        // Only check with server if we don't have persisted state
        console.log('AuthStore - No persisted auth, checking with server');
        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          console.log('AuthStore - user fetched from server:', user);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          console.error('AuthStore - checkAuth error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
