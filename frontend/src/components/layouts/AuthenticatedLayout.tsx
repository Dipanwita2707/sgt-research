'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false); // Default expanded
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f5f7fa]">
        <Header onMobileMenuClick={() => setIsMobileOpen(true)} />
        <Sidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
        <main className={`pt-14 transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
          <div className="p-5">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
