'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Ensure auth is checked on mount
    const initAuth = async () => {
      await checkAuth();
      setIsInitialized(true);
    };
    
    if (!isInitialized) {
      initAuth();
    }
  }, [checkAuth, isInitialized]);

  useEffect(() => {
    console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
    console.log('ProtectedRoute - isLoading:', isLoading);
    console.log('ProtectedRoute - isInitialized:', isInitialized);
    
    if (isInitialized && !isLoading && !isAuthenticated) {
      console.log('ProtectedRoute - Redirecting to login');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isInitialized, router]);

  if (!isInitialized || isLoading) {
    console.log('ProtectedRoute - Showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, returning null');
    return null;
  }

  console.log('ProtectedRoute - Rendering children');
  return <>{children}</>;
}
