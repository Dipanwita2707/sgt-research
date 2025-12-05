'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app load
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}