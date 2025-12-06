'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, Bell, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '@/services/notification.service';

interface HeaderProps {
  onMobileMenuClick?: () => void;
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) return user.firstName.substring(0, 2).toUpperCase();
    return user?.username?.substring(0, 2).toUpperCase() || 'U';
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{ 
        background: 'linear-gradient(90deg, #005b96 0%, #6497b1 100%)',
        boxShadow: '0 2px 12px rgba(0,91,150,0.08)'
      }}
    >
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: Logo Section - Dark navy header like LMS */}
        <div className="flex items-center gap-3">
          {/* SGT Logo - white version for dark header */}
          <div className="flex items-center">
            <img 
              src="/images/new-header-logo.png" 
              alt="SGT University" 
              className="h-10 object-contain brightness-0 invert"
            />
          </div>
        </div>

        {/* Right: Notifications + User Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications Bell - White on dark like LMS */}
          <button 
            onClick={() => router.push('/notifications')}
            className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Avatar - Colored circle like LMS */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold shadow-md border-2 border-white/30">
                {getUserInitials()}
              </div>
              <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 hidden sm:block ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-1 z-50 border border-gray-100 overflow-hidden">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                </div>
                
                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => { router.push('/profile'); setShowMenu(false); }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3 text-gray-400" />
                    My Profile
                  </button>
                  <button
                    onClick={() => { router.push('/settings'); setShowMenu(false); }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3 text-gray-400" />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
