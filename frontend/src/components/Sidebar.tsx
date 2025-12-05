'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  FileText, 
  Settings, 
  Users, 
  Lightbulb, 
  ClipboardCheck, 
  UserCheck, 
  DollarSign, 
  Building, 
  ChevronDown,
  Eye,
  Bell,
  ChevronRight,
  GraduationCap,
  MapPin,
  Upload,
  BarChart3,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
  requiresPermission?: string; // Permission name required to see this item
  subItems?: NavItem[];
}

interface DepartmentPermission {
  category: string;
  permissions: string[];
}

// Helper to check if user has a specific permission
// Supports both naming conventions: 'ipr_file_new' and 'drd_ipr_file'
const hasPermission = (permissions: DepartmentPermission[], permissionName: string): boolean => {
  // Generate variants to check
  const variants = [
    permissionName,
    `drd_${permissionName}`,
    permissionName.replace('drd_', ''),
    permissionName.replace('_new', ''),  // ipr_file_new -> ipr_file
    `drd_${permissionName.replace('_new', '')}`,  // ipr_file_new -> drd_ipr_file
  ];
  
  for (const dept of permissions) {
    if (dept.permissions.some(p => 
      variants.some(variant => 
        p.toLowerCase() === variant.toLowerCase() ||
        p.toLowerCase().includes(permissionName.toLowerCase())
      )
    )) {
      return true;
    }
  }
  return false;
};

// Helper to check if user has any DRD/IPR related permissions (ipr_review or ipr_approve)
const hasDrdPermissions = (permissions: DepartmentPermission[]): boolean => {
  // Check for new simplified permissions: ipr_review, ipr_approve, ipr_assign_school
  const drdPermissionKeys = ['ipr_review', 'ipr_approve', 'ipr_assign_school'];
  for (const dept of permissions) {
    if (dept.permissions.some(p => 
      drdPermissionKeys.some(key => p.toLowerCase() === key.toLowerCase())
    )) {
      return true;
    }
  }
  return false;
};

// Helper to check if user has finance permissions
const hasFinancePermissions = (permissions: DepartmentPermission[]): boolean => {
  const financeKeywords = ['finance', 'incentive', 'payment', 'audit'];
  for (const dept of permissions) {
    if (dept.permissions.some(p => 
      financeKeywords.some(keyword => p.toLowerCase().includes(keyword))
    )) {
      return true;
    }
  }
  return false;
};

// Base IPR menu for faculty and students (can file IPR by default)
const getIprSubItems = (permissions: DepartmentPermission[], userRole: string | undefined): NavItem[] => {
  const items: NavItem[] = [
    { name: 'My IPR', href: '/ipr/my-applications', icon: ClipboardCheck },
    { name: 'Apply for IPR', href: '/ipr/apply', icon: Lightbulb },
  ];
  
  // Only show DRD Dashboard if user has DRD permissions (checkbox granted)
  if (hasDrdPermissions(permissions)) {
    items.push({ name: 'DRD Dashboard', href: '/drd', icon: UserCheck });
  }
  
  // Only show Finance Processing if user has finance permissions (checkbox granted)
  if (hasFinancePermissions(permissions)) {
    items.push({ name: 'Finance Processing', href: '/finance/processing', icon: DollarSign });
  }
  
  return items;
};

// Student IPR menu - basic filing only
const studentIprSubItems: NavItem[] = [
  { name: 'My IPR', href: '/ipr/my-applications', icon: ClipboardCheck },
  { name: 'Apply for IPR', href: '/ipr/apply', icon: Lightbulb },
];

// Staff IPR menu (for non-teaching staff with ipr_file_new permission from admin)
const staffIprSubItems: NavItem[] = [
  { name: 'My IPR', href: '/ipr/my-applications', icon: ClipboardCheck },
  { name: 'Apply for IPR', href: '/ipr/apply', icon: Lightbulb },
];

const getNavItems = (
  userRole: string | undefined, 
  userType: string | undefined,
  permissions: DepartmentPermission[]
): NavItem[] => {
  const isStudent = userRole === 'student' || userType === 'student';
  const isFaculty = userRole === 'faculty' || userType === 'faculty';
  const isStaff = userRole === 'staff' || userType === 'staff';
  const isAdmin = userRole === 'admin' || userType === 'admin';
  
  const items: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
  ];
  
  // Determine if user can file IPR
  // Faculty and Student have inherent IPR filing rights
  // Staff/Admin need explicit ipr_file_new permission
  const canFileIpr = isFaculty || isStudent || hasPermission(permissions, 'ipr_file_new');
  
  // Check if staff/admin has any IPR-related permissions (DRD review, finance, etc.)
  const hasAnyIprPermission = (
    hasDrdPermissions(permissions) || 
    hasFinancePermissions(permissions) ||
    hasPermission(permissions, 'ipr_review') ||
    hasPermission(permissions, 'ipr_approve')
  );
  
  // Show IPR Management to users who can file OR have other IPR permissions
  if (canFileIpr || hasAnyIprPermission) {
    let subItems: NavItem[];
    
    if (isStudent) {
      // Students: always have IPR filing rights
      subItems = studentIprSubItems;
    } else if (isFaculty) {
      // Faculty: always have IPR filing rights, build full menu
      subItems = [];
      subItems.push(
        { name: 'My IPR', href: '/ipr/my-applications', icon: ClipboardCheck },
        { name: 'Apply for IPR', href: '/ipr/apply', icon: Lightbulb }
      );
      // Add DRD Dashboard if they have DRD permissions
      if (hasDrdPermissions(permissions)) {
        subItems.push({ name: 'DRD Dashboard', href: '/drd', icon: UserCheck });
      }
      // Add Finance if they have finance permissions
      if (hasFinancePermissions(permissions)) {
        subItems.push({ name: 'Finance Processing', href: '/finance/processing', icon: DollarSign });
      }
    } else if (isStaff || isAdmin) {
      // Staff/Admin with permissions - build menu based on what they have
      subItems = [];
      
      // Add filing options if they have ipr_file_new permission
      if (canFileIpr) {
        subItems.push(
          { name: 'My IPR', href: '/ipr/my-applications', icon: ClipboardCheck },
          { name: 'Apply for IPR', href: '/ipr/apply', icon: Lightbulb }
        );
      }
      
      // Add DRD Dashboard if they have DRD permissions
      if (hasDrdPermissions(permissions)) {
        subItems.push({ name: 'DRD Dashboard', href: '/drd', icon: UserCheck });
      }
      
      // Add Finance if they have finance permissions
      if (hasFinancePermissions(permissions)) {
        subItems.push({ name: 'Finance Processing', href: '/finance/processing', icon: DollarSign });
      }
    } else {
      subItems = canFileIpr ? getIprSubItems(permissions, userRole) : [];
    }
    
    if (subItems.length > 0) {
      items.push({ 
        name: 'IPR Management', 
        href: '/ipr', 
        icon: Lightbulb,
        subItems
      });
    }
  }
  
  items.push(
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Settings', href: '/settings', icon: Settings },
    { 
      name: 'Admin', 
      href: '/admin', 
      icon: Users, 
      adminOnly: true,
      subItems: [
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Bulk Upload', href: '/admin/bulk-upload', icon: Upload },
        { name: 'Schools', href: '/admin/schools', icon: GraduationCap },
        { name: 'Departments', href: '/admin/departments', icon: Building },
        { name: 'Programs', href: '/admin/programs', icon: BookOpen },
        { name: 'Central Departments', href: '/admin/central-departments', icon: Building },
        { name: 'Employees', href: '/admin/employees', icon: Users },
        { name: 'Students', href: '/admin/students', icon: GraduationCap },
        { name: 'Permissions', href: '/admin/permissions', icon: Settings },
        { name: 'DRD School Assignment', href: '/admin/drd-school-assignment', icon: MapPin },
        { name: 'Incentive Policies', href: '/admin/incentive-policies', icon: Settings },
      ]
    }
  );
  
  return items;
};

// Helper function to get department route
const getDepartmentRoute = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  const routeMap: { [key: string]: string } = {
    'drd': '/drd',
    'directorate of research and development': '/drd',
    'directorate-of-research-and-development': '/drd',
    'development & research department': '/drd',
    'research projects': '/drd',
    'research grants': '/drd',
    'research publications': '/drd',
    'ipr applications': '/drd',
    'ipr review workflow': '/drd',
    'analytics & reports': '/drd',
    'system administration': '/drd',
    'hr': '/hr/dashboard',
    'human resources': '/hr/dashboard',
    'finance': '/finance/processing',
    'finance department': '/finance/processing',
    'library': '/library/dashboard',
    'library department': '/library/dashboard',
    'it': '/it/dashboard',
    'it department': '/it/dashboard',
    'information technology': '/it/dashboard',
    'admissions': '/admissions/dashboard',
    'admissions office': '/admissions/dashboard',
    'registrar': '/registrar/dashboard',
    'students': '/students/dashboard',
    'faculty': '/faculty/dashboard',
    'courses': '/courses/dashboard',
    'examinations': '/examinations/dashboard',
    'research': '/research/dashboard',
  };
  
  // Check for exact match first
  if (routeMap[categoryLower]) {
    return routeMap[categoryLower];
  }
  
  // Check for partial matches (e.g., "drd" in "directorate of research...")
  for (const [key, route] of Object.entries(routeMap)) {
    if (categoryLower.includes(key) || key.includes(categoryLower)) {
      return route;
    }
  }
  
  // Default fallback - go to dashboard
  return '/dashboard';
};

// Helper function to get display name for departments
const getDepartmentDisplayName = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  const displayMap: { [key: string]: string } = {
    'drd': 'DRD Dashboard',
    'directorate of research and development': 'DRD Dashboard',
    'directorate-of-research-and-development': 'DRD Dashboard',
    'development & research department': 'DRD Dashboard',
    'research projects': 'Research Projects',
    'research grants': 'Research Grants', 
    'research publications': 'Publications',
    'ipr applications': 'IPR Management',
    'ipr review workflow': 'IPR Review',
    'analytics & reports': 'Analytics',
    'system administration': 'System Admin',
    'hr': 'Human Resources',
    'human resources': 'Human Resources',
    'finance': 'Finance',
    'finance department': 'Finance',
    'library': 'Library',
    'library department': 'Library',
    'it': 'IT Department',
    'it department': 'IT Department',
    'information technology': 'IT Department',
    'admissions': 'Admissions',
    'admissions office': 'Admissions',
    'registrar': 'Registrar',
    'students': 'Student Management',
    'faculty': 'Faculty Management',
    'courses': 'Course Management',
    'examinations': 'Examinations',
    'research': 'Research',
  };
  
  // Check for exact match
  if (displayMap[categoryLower]) {
    return displayMap[categoryLower];
  }
  
  // Check for partial matches
  for (const [key, displayName] of Object.entries(displayMap)) {
    if (categoryLower.includes(key) || key.includes(categoryLower)) {
      return displayName;
    }
  }
  
  // Format the category name as fallback
  return category.split(/[\s_-]+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<DepartmentPermission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // Fetch permissions on mount/user change
  useEffect(() => {
    if (user) {
      fetchUserPermissions();
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      setIsLoadingPermissions(true);
      const response = await api.get('/dashboard/staff');
      if (response.data.success) {
        setUserPermissions(response.data.data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  // Nav items depend on permissions, so compute after permissions are loaded
  const navItems = getNavItems(user?.role?.name, user?.userType, userPermissions);

  // Filter admin-only items
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.userType === 'admin' || user?.role?.name === 'admin'
  );

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <aside className="hidden md:flex md:flex-col w-72 bg-white border-r border-gray-100 shadow-sm">
      {/* Logo Section */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 bg-sgt-gradient rounded-xl flex items-center justify-center shadow-sgt animate-pulse-glow">
              <span className="text-white font-bold text-xl">S</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-sgt-gradient">SGT University</h1>
            <p className="text-[10px] text-gray-400 tracking-wider uppercase">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {/* Main Navigation Label */}
        <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Main Menu
        </p>

        {filteredNavItems.map((item: NavItem) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isExpanded = expandedItems.includes(item.name);
          
          return (
            <div key={item.name} className="animate-slideIn">
              {item.subItems ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-sgt-gradient text-white shadow-sgt'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-sgt-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-sgt-50'}`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-sgt-600'}`} />
                      </div>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isActive ? 'text-white/70' : 'text-gray-400'}`} 
                    />
                  </button>
                  
                  {/* Sub Items */}
                  {isExpanded && (
                    <div className="ml-4 mt-2 space-y-1 pl-4 border-l-2 border-sgt-100">
                      {item.subItems.map((subItem: NavItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                              isSubActive
                                ? 'bg-sgt-50 text-sgt-700 font-medium border-l-2 border-sgt-600 -ml-[2px]'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-sgt-600'
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-sgt-600' : 'text-gray-400'}`} />
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-sgt-gradient text-white shadow-sgt'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-sgt-600'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-sgt-50'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-sgt-600'}`} />
                  </div>
                  <span className="font-medium text-sm">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/70" />}
                </Link>
              )}
            </div>
          );
        })}

        {/* My Departments Section */}
        {user?.userType !== 'admin' && userPermissions.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              My Departments
            </p>
            {userPermissions.map((dept, index) => {
              const isExpanded = expandedItems.includes(dept.category);
              const departmentRoute = getDepartmentRoute(dept.category);
              const isActive = pathname === departmentRoute || pathname.startsWith(departmentRoute + '/');
              
              return (
                <div key={index} className="mb-2">
                  <Link
                    href={departmentRoute}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-sgt-50 to-sgt-100 text-sgt-700 font-medium border border-sgt-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Building className={`w-4 h-4 ${isActive ? 'text-sgt-600' : 'text-gray-400'}`} />
                      <span>{getDepartmentDisplayName(dept.category)}</span>
                    </div>
                    <span className="text-[10px] bg-sgt-600 text-white px-2 py-0.5 rounded-full">
                      {dept.permissions.length}
                    </span>
                  </Link>
                  
                  {/* Permissions Preview Toggle */}
                  <button
                    onClick={() => toggleExpand(dept.category)}
                    className="w-full flex items-center justify-center px-4 py-1 text-xs text-gray-400 hover:text-sgt-600 transition-colors"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1 animate-slideUp">
                      {dept.permissions.slice(0, 3).map((permission, permIndex) => (
                        <div key={permIndex} className="text-[11px] text-gray-500 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                          {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      ))}
                      {dept.permissions.length > 3 && (
                        <div className="text-[11px] text-sgt-600 px-3 font-medium">
                          +{dept.permissions.length - 3} more permissions
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sgt-gradient rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-500">Powered by</p>
            <p className="text-xs font-semibold text-sgt-700">SGT University</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          © 2024 All Rights Reserved
        </p>
      </div>
    </aside>
  );
}
