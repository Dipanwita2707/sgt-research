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
        // If we already have user data from persisted state, validate it with the server
        // But don't clear the user immediately - only on explicit auth failure
        if (state.user && state.isAuthenticated) {
          console.log('AuthStore - Already have user from persisted state:', state.user.username);
          // Optionally validate in background without blocking
          try {
            const user = await authService.getCurrentUser();
            console.log('AuthStore - Validated user from server:', user.username);
            set({ user, isAuthenticated: true, isLoading: false });
          } catch (error) {
            console.log('AuthStore - Server validation failed, clearing auth');
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
          return;
        }
        
        console.log('AuthStore - No persisted auth, checking with server');
        set({ isLoading: true });
        try {
          const isAuth = await authService.checkAuthentication();
          if (isAuth) {
            console.log('AuthStore - authenticated, fetching user');
            const user = await authService.getCurrentUser();
            console.log('AuthStore - user fetched:', user);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            console.log('AuthStore - not authenticated');
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
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
