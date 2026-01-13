'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import NavigationHeader from '@/components/NavigationHeader';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f5f7fa]">
        <NavigationHeader />
        <main className="pt-[104px]">
          <div className="px-6 py-5 max-w-[1920px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
