'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Bell, ChevronDown, Search } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '@/services/notification.service';
import api from '@/lib/api';
import Link from 'next/link';

interface DepartmentPermission {
  category: string;
  permissions: string[];
}

interface SubMenuItem {
  name: string;
  href: string;
  description?: string;
}

interface MenuItem {
  name: string;
  subItems?: SubMenuItem[];
}

const hasPermission = (permissions: DepartmentPermission[], permissionName: string): boolean => {
  const variants = [permissionName, `drd_${permissionName}`, permissionName.replace('drd_', '')];
  for (const dept of permissions) {
    if (dept.permissions.some(p => variants.some(v => p.toLowerCase().includes(v.toLowerCase())))) return true;
  }
  return false;
};

const hasDrdPermissions = (permissions: DepartmentPermission[]): boolean => {
  if (!permissions || permissions.length === 0) return false;
  
  const drdKeys = [
    'ipr_review', 'ipr_approve', 'ipr_assign_school', 'ipr_recommend',
    'research_review', 'research_approve', 'research_assign_school',
    'book_review', 'book_approve', 'book_assign_school',
    'drd_review', 'drd_approve', 'drd_recommend', 'drd_view_all',
    'view_all_ipr', 'review_ipr', 'approve_ipr', 'ipr'
  ];
  
  for (const dept of permissions) {
    const category = dept.category?.toLowerCase() || '';
    if (category.includes('drd') || category.includes('research') || category.includes('development') || category.includes('book')) {
      return true;
    }
    for (const perm of dept.permissions || []) {
      const permLower = perm.toLowerCase();
      if (drdKeys.some(k => permLower.includes(k.toLowerCase()))) {
        return true;
      }
    }
  }
  return false;
};

const hasFinancePermissions = (permissions: DepartmentPermission[]): boolean => {
  const keys = ['finance', 'incentive', 'payment'];
  for (const dept of permissions) {
    if (dept.permissions.some(p => keys.some(k => p.toLowerCase().includes(k)))) return true;
  }
  return false;
};

export default function NavigationHeader() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userPermissions, setUserPermissions] = useState<DepartmentPermission[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const isStudent = user?.role?.name === 'student' || user?.userType === 'student';
  const isFaculty = user?.role?.name === 'faculty' || user?.userType === 'faculty';
  const isAdmin = user?.role?.name === 'admin' || user?.userType === 'admin';

  const canFileIpr = isFaculty || isStudent || isAdmin || hasPermission(userPermissions, 'ipr_file_new');
  const canFileResearch = isFaculty || isStudent || isAdmin || hasPermission(userPermissions, 'research_file_new');
  const hasDrdAccess = hasDrdPermissions(userPermissions) || isAdmin;
  const hasFinanceAccess = hasFinancePermissions(userPermissions);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchUserPermissions();
    }
    
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const response = await api.get('/dashboard/staff');
      if (response.data.success) {
        setUserPermissions(response.data.data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      
      // Check all dropdown refs
      const clickedInsideDropdown = Object.values(dropdownRefs.current).some(
        ref => ref && ref.contains(event.target as Node)
      );
      
      if (!clickedInsideDropdown) {
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) return user.firstName.substring(0, 2).toUpperCase();
    return user?.username?.substring(0, 2).toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) return user.firstName;
    return user?.username || 'User';
  };

  // Build menu items based on permissions
  const menuItems: MenuItem[] = [];

  // Academics menu (for faculty and students)
  if (canFileIpr || canFileResearch) {
    menuItems.push({
      name: 'Academics',
      subItems: [
        { name: 'My Work', href: '/my-work', description: 'View all your work' },
        ...(canFileIpr ? [
          { name: 'New IPR Application', href: '/ipr/apply', description: 'File a new IPR application' },
          { name: 'My IPR Applications', href: '/ipr/my-applications', description: 'View your IPR submissions' },
        ] : []),
        ...(canFileResearch ? [
          { name: 'New Research Contribution', href: '/research/apply', description: 'Submit research contribution' },
          { name: 'My Research', href: '/research/my-contributions', description: 'View your research work' },
        ] : []),
        ...(isFaculty ? [
          { name: 'Mentor Approvals', href: '/mentor-approvals', description: 'Approve student work' },
        ] : []),
      ],
    });
  }

  // Administrative menu
  if (hasDrdAccess || hasFinanceAccess) {
    const adminSubItems: SubMenuItem[] = [];
    
    if (hasDrdAccess) {
      adminSubItems.push({ name: 'DRD Dashboard', href: '/drd', description: 'Department of Research & Development' });
    }
    
    if (hasFinanceAccess) {
      adminSubItems.push({ name: 'Finance Dashboard', href: '/finance/dashboard', description: 'Financial management' });
    }
    
    menuItems.push({
      name: 'Administrative',
      subItems: adminSubItems,
    });
  }

  // Admin menu (system admin only)
  if (isAdmin) {
    menuItems.push({
      name: 'System Admin',
      subItems: [
        { name: 'Analytics', href: '/admin/analytics', description: 'System analytics' },
        { name: 'Schools', href: '/admin/schools', description: 'Manage schools' },
        { name: 'Departments', href: '/admin/departments', description: 'Manage departments' },
        { name: 'Programs', href: '/admin/programs', description: 'Manage programs' },
        { name: 'Central Departments', href: '/admin/central-departments', description: 'Manage central departments' },
        { name: 'Employees', href: '/admin/employees', description: 'Manage employees' },
        { name: 'Students', href: '/admin/students', description: 'Manage students' },
        { name: 'Permissions', href: '/admin/permissions', description: 'Manage permissions' },
        { name: 'Bulk Upload', href: '/admin/bulk-upload', description: 'Upload bulk data' },
      ],
    });

    menuItems.push({
      name: 'School Assignments',
      subItems: [
        { name: 'IPR School Assignment', href: '/admin/drd-school-assignment', description: 'Assign IPR to schools' },
        { name: 'Research School Assignment', href: '/admin/research-school-assignment', description: 'Assign research to schools' },
        { name: 'Book School Assignment', href: '/admin/book-school-assignment', description: 'Assign books to schools' },
        { name: 'Conference School Assignment', href: '/admin/conference-school-assignment', description: 'Assign conferences' },
        { name: 'Grant School Assignment', href: '/admin/grant-school-assignment', description: 'Assign grants' },
      ],
    });

    menuItems.push({
      name: 'Policy Management',
      subItems: [
        { name: 'IPR Policies', href: '/admin/incentive-policies', description: 'Manage IPR policies' },
        { name: 'Research Policies', href: '/admin/research-policies', description: 'Manage research policies' },
        { name: 'Book Policies', href: '/admin/book-policies', description: 'Manage book policies' },
        { name: 'Book Chapter Policies', href: '/admin/book-chapter-policies', description: 'Manage chapter policies' },
        { name: 'Conference Policies', href: '/admin/conference-policies', description: 'Manage conference policies' },
        { name: 'Grant Policies', href: '/admin/grant-policies', description: 'Manage grant policies' },
      ],
    });
  }

  // Student Services (for students)
  if (isStudent) {
    menuItems.push({
      name: 'Student Services',
      subItems: [
        { name: 'Settings', href: '/settings', description: 'Account settings' },
        { name: 'Notifications', href: '/notifications', description: 'View notifications' },
      ],
    });
  }

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50"
      style={{ 
        background: 'linear-gradient(90deg, #005b96 0%, #6497b1 100%)',
        boxShadow: '0 2px 12px rgba(0,91,150,0.08)'
      }}
    >
      {/* Top Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-white/10">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <img 
            src="/images/new-header-logo.png" 
            alt="SGT University" 
            className="h-10 object-contain brightness-0 invert"
          />
          <div className="hidden lg:block">
            <div className="text-white font-bold text-sm">UNIVERSITY</div>
            <div className="text-white/70 text-xs">MANAGEMENT SYSTEM</div>
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block">
            <Search className="w-5 h-5" />
          </button>

          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Notifications */}
          <button 
            onClick={() => router.push('/notifications')}
            className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pr-3 hover:bg-white/10 rounded-full transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold shadow-md border-2 border-white/30">
                {getUserInitials()}
              </div>
              <span className="text-white text-sm font-medium hidden md:block">{getUserDisplayName()}</span>
              <ChevronDown className={`w-4 h-4 text-white/80 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                </div>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="h-12 px-6 flex items-center gap-1 bg-[#004578]">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
            pathname === '/dashboard'
              ? 'bg-white/20 text-white shadow-lg'
              : 'text-white/90 hover:bg-white/15 hover:text-white hover:shadow-md'
          }`}
        >
          Dashboard
        </Link>

        {/* Dynamic Menu Items */}
        {menuItems.map((item) => (
          <div 
            key={item.name}
            className="relative"
            ref={(el) => { dropdownRefs.current[item.name] = el; }}
          >
            <button
              onClick={() => setActiveDropdown(activeDropdown === item.name ? null : item.name)}
              onMouseEnter={() => setActiveDropdown(item.name)}
              className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                activeDropdown === item.name
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/90 hover:bg-white/15 hover:text-white hover:shadow-md'
              }`}
            >
              {item.name}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === item.name ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown - Blue Glassmorphism Effect Full Width */}
            {activeDropdown === item.name && item.subItems && (
              <div 
                className="fixed left-0 right-0 mt-2 shadow-2xl border-t border-gray-200 p-8 z-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.80) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px 0 rgba(0, 69, 120, 0.15)',
                }}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-2 gap-6">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-center justify-between py-4 px-2 transition-all duration-200 hover:pl-4"
                      >
                        <div className="flex-1">
                          <div className="text-base font-semibold text-[#005b96] group-hover:text-[#003d66] transition-colors">
                            {subItem.name}
                          </div>
                          {subItem.description && (
                            <div className="text-sm text-[#005b96]/70 mt-1">{subItem.description}</div>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <svg 
                            className="w-6 h-6 text-[#005b96]/60 group-hover:text-[#005b96] group-hover:translate-x-1 transition-all" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
}
