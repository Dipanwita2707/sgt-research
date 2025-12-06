'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only check auth if we don't have a user and aren't already loading
    const initAuth = async () => {
      // If already authenticated with user data, skip the check
      if (isAuthenticated && user) {
        console.log('ProtectedRoute - Already authenticated with user');
        setIsInitialized(true);
        return;
      }
      
      // Otherwise, verify auth status
      await checkAuth();
      setIsInitialized(true);
    };
    
    if (!isInitialized && !isLoading) {
      initAuth();
    }
  }, [checkAuth, isInitialized, isLoading, isAuthenticated, user]);

  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      console.log('ProtectedRoute - Not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isInitialized, router]);

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
