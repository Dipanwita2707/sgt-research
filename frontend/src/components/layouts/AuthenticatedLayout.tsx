'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import NavigationHeader from '@/components/NavigationHeader';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        <NavigationHeader />
        <main className="pt-[104px]">
          <div className="px-6 py-8 max-w-[1920px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}