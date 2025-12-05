'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, Bell, ChevronDown, Shield, GraduationCap } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '@/services/notification.service';

export default function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch unread notification count
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
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const getUserBadge = () => {
    if (user?.userType === 'student') {
      return (
        <span className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-sgt-50 to-sgt-100 text-sgt-700 px-3 py-1.5 rounded-full font-semibold border border-sgt-200">
          <GraduationCap className="w-3 h-3" />
          Student
        </span>
      );
    } else if (user?.userType === 'staff') {
      return (
        <span className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-semibold border border-emerald-200">
          <Shield className="w-3 h-3" />
          Staff
        </span>
      );
    } else if (user?.userType === 'admin') {
      return (
        <span className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-sgt-600 to-sgt-700 text-white px-3 py-1.5 rounded-full font-semibold shadow-sm">
          <Shield className="w-3 h-3" />
          Administrator
        </span>
      );
    }
    return null;
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            {/* SGT University Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-sgt-gradient rounded-xl flex items-center justify-center shadow-sgt">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-sgt-50 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-sgt-gradient">
                  SGT University
                </h1>
                <p className="text-[10px] text-gray-500 -mt-0.5 tracking-wider uppercase">
                  University Management System
                </p>
              </div>
            </div>
          </div>

          {/* Center - Date/Time (hidden on mobile) */}
          <div className="hidden lg:flex items-center text-sm text-gray-500">
            <span className="px-4 py-1.5 bg-gray-50 rounded-full text-xs font-medium">
              {formatDate()}
            </span>
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button 
              onClick={() => router.push('/notifications')}
              className="relative p-2.5 hover:bg-gray-50 rounded-xl transition-colors group"
            >
              <Bell className="w-5 h-5 text-gray-500 group-hover:text-sgt-600 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-3 py-2 transition-all duration-200 border border-transparent hover:border-gray-100"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-sgt-gradient flex items-center justify-center shadow-sm">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  
                  {/* User Info */}
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {user?.firstName || user?.username || 'User'}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                      {user?.email}
                    </p>
                  </div>
                  
                  {/* Badge */}
                  <div className="hidden sm:block">
                    {getUserBadge()}
                  </div>
                  
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-sgt-lg py-2 z-50 border border-gray-100 animate-slideUp overflow-hidden">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-sgt-gradient flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user?.firstName || user?.username}
                        </p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        router.push('/profile');
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3 text-gray-400" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        router.push('/settings');
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3 text-gray-400" />
                      Settings
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-2">
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
      </div>
    </header>
  );
}
