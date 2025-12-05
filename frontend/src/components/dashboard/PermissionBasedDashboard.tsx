'use client';

import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Lightbulb, 
  FileText, 
  DollarSign,
  Building2,
  Library,
  ClipboardList,
  Settings,
  BarChart3,
  UserCog,
  Briefcase,
  Award,
  Monitor,
  ChevronRight,
  Shield
} from 'lucide-react';

// Import widgets
import StudentsWidget from './widgets/StudentsWidget';
import FacultyWidget from './widgets/FacultyWidget';
import AcademicsWidget from './widgets/AcademicsWidget';
import ResearchWidget from './widgets/ResearchWidget';
import FinanceWidget from './widgets/FinanceWidget';
import LibraryWidget from './widgets/LibraryWidget';
import ExaminationsWidget from './widgets/ExaminationsWidget';
import AdmissionsWidget from './widgets/AdmissionsWidget';
import ReportsWidget from './widgets/ReportsWidget';
import SystemWidget from './widgets/SystemWidget';
import StaffWidget from './widgets/StaffWidget';

// Permission category to widget mapping
const CATEGORY_WIDGETS: Record<string, {
  component: React.ComponentType<any>;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
  href: string;
}> = {
  'Students': {
    component: StudentsWidget,
    icon: GraduationCap,
    title: 'Students',
    description: 'Manage student records and data',
    color: 'from-blue-500 to-blue-600',
    href: '/students'
  },
  'Faculty': {
    component: FacultyWidget,
    icon: Users,
    title: 'Faculty',
    description: 'Faculty management and workload',
    color: 'from-purple-500 to-purple-600',
    href: '/faculty'
  },
  'Academics': {
    component: AcademicsWidget,
    icon: BookOpen,
    title: 'Academics',
    description: 'Courses, curriculum and schedules',
    color: 'from-indigo-500 to-indigo-600',
    href: '/academics'
  },
  'Research': {
    component: ResearchWidget,
    icon: Lightbulb,
    title: 'Research',
    description: 'Research projects and publications',
    color: 'from-amber-500 to-amber-600',
    href: '/research'
  },
  'DRD': {
    component: ResearchWidget,
    icon: Award,
    title: 'DRD / IPR',
    description: 'IPR and research development',
    color: 'from-teal-500 to-teal-600',
    href: '/drd'
  },
  'Directorate of Research and Development': {
    component: ResearchWidget,
    icon: Award,
    title: 'DRD / IPR',
    description: 'IPR and research development',
    color: 'from-teal-500 to-teal-600',
    href: '/drd'
  },
  'Finance': {
    component: FinanceWidget,
    icon: DollarSign,
    title: 'Finance',
    description: 'Financial management and reports',
    color: 'from-emerald-500 to-emerald-600',
    href: '/finance'
  },
  'Finance Department': {
    component: FinanceWidget,
    icon: DollarSign,
    title: 'Finance',
    description: 'Financial management and reports',
    color: 'from-emerald-500 to-emerald-600',
    href: '/finance'
  },
  'Library': {
    component: LibraryWidget,
    icon: Library,
    title: 'Library',
    description: 'Library resources and books',
    color: 'from-orange-500 to-orange-600',
    href: '/library'
  },
  'Examinations': {
    component: ExaminationsWidget,
    icon: ClipboardList,
    title: 'Examinations',
    description: 'Exam schedules and results',
    color: 'from-red-500 to-red-600',
    href: '/examinations'
  },
  'Admissions': {
    component: AdmissionsWidget,
    icon: Building2,
    title: 'Admissions',
    description: 'Student admissions management',
    color: 'from-cyan-500 to-cyan-600',
    href: '/admissions'
  },
  'HR': {
    component: StaffWidget,
    icon: UserCog,
    title: 'Human Resources',
    description: 'HR and employee management',
    color: 'from-pink-500 to-pink-600',
    href: '/hr'
  },
  'Human Resources': {
    component: StaffWidget,
    icon: UserCog,
    title: 'Human Resources',
    description: 'HR and employee management',
    color: 'from-pink-500 to-pink-600',
    href: '/hr'
  },
  'IT': {
    component: SystemWidget,
    icon: Monitor,
    title: 'IT Systems',
    description: 'IT infrastructure management',
    color: 'from-slate-500 to-slate-600',
    href: '/it'
  },
  'Reports': {
    component: ReportsWidget,
    icon: BarChart3,
    title: 'Reports',
    description: 'Analytics and reporting',
    color: 'from-violet-500 to-violet-600',
    href: '/reports'
  },
  'System': {
    component: SystemWidget,
    icon: Settings,
    title: 'System',
    description: 'System configuration',
    color: 'from-gray-500 to-gray-600',
    href: '/settings'
  },
  'Staff': {
    component: StaffWidget,
    icon: Briefcase,
    title: 'Staff',
    description: 'Staff management',
    color: 'from-rose-500 to-rose-600',
    href: '/staff'
  },
  'Registrar': {
    component: StudentsWidget,
    icon: FileText,
    title: 'Registrar',
    description: 'Academic records management',
    color: 'from-sky-500 to-sky-600',
    href: '/registrar'
  }
};

interface PermissionBasedDashboardProps {
  userPermissions: Array<{
    category: string;
    permissions: string[];
  }>;
  userRole: string;
}

export default function PermissionBasedDashboard({ userPermissions, userRole }: PermissionBasedDashboardProps) {
  const { user } = useAuthStore();

  // Debug logging
  console.log('PermissionBasedDashboard - userPermissions:', userPermissions);
  console.log('PermissionBasedDashboard - userRole:', userRole);

  // Get unique categories from permissions
  const permissionCategories = userPermissions.map(p => p.category);
  
  // Extract all permission keys
  const allPermissionKeys = userPermissions.flatMap(perm => 
    Array.isArray(perm.permissions) ? perm.permissions : []
  );

  // Get widgets to display based on permission categories
  const widgetsToDisplay = permissionCategories
    .map(category => {
      const widgetConfig = CATEGORY_WIDGETS[category];
      if (widgetConfig) {
        const permissions = userPermissions.find(p => p.category === category)?.permissions || [];
        return {
          category,
          config: widgetConfig,
          permissions
        };
      }
      return null;
    })
    .filter(Boolean);

  // Remove duplicates based on title
  const uniqueWidgets = widgetsToDisplay.filter((widget, index, self) => 
    index === self.findIndex(w => w?.config.title === widget?.config.title)
  );

  return (
    <div className="space-y-6">
      {/* Permission Categories Count */}
      {uniqueWidgets.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4" />
          <span>You have access to <strong className="text-sgt-700">{uniqueWidgets.length}</strong> module{uniqueWidgets.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Widget Grid */}
      {uniqueWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {uniqueWidgets.map((widget, index) => {
            if (!widget) return null;
            const { config, permissions, category } = widget;
            const IconComponent = config.icon;
            
            return (
              <Link
                key={`${category}-${index}`}
                href={config.href}
                className="group bg-white rounded-2xl p-5 shadow-sgt border border-gray-100 hover:shadow-sgt-lg transition-all duration-300 card-hover"
              >
                {/* Icon Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-sgt-600 group-hover:translate-x-1 transition-all" />
                </div>

                {/* Title & Description */}
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-sgt-700 transition-colors">
                  {config.title}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {config.description}
                </p>

                {/* Permission Count Badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sgt-50 text-sgt-700 border border-sgt-100">
                    {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Permissions List (collapsed) */}
                {permissions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {permissions.slice(0, 3).map((perm, i) => (
                        <span 
                          key={i}
                          className="inline-block px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-md"
                        >
                          {perm.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {permissions.length > 3 && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded-md">
                          +{permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Modules Assigned</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            You don't have access to any modules yet. Please contact your administrator to assign appropriate permissions.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-600">
            <span>Current role:</span>
            <span className="font-semibold text-gray-900 capitalize">{userRole}</span>
          </div>
        </div>
      )}

      {/* Quick Actions based on role */}
      {allPermissionKeys.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allPermissionKeys.includes('file_ipr') && (
              <Link 
                href="/ipr/apply"
                className="flex items-center gap-2 p-3 bg-sgt-50 hover:bg-sgt-100 rounded-xl text-sgt-700 transition-colors text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                <span>New IPR</span>
              </Link>
            )}
            {allPermissionKeys.includes('view_own_ipr') && (
              <Link 
                href="/ipr/my-applications"
                className="flex items-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-700 transition-colors text-sm font-medium"
              >
                <ClipboardList className="w-4 h-4" />
                <span>My IPR</span>
              </Link>
            )}
            {(allPermissionKeys.includes('ipr_review') || allPermissionKeys.includes('ipr_recommend')) && (
              <Link 
                href="/drd/review"
                className="flex items-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-700 transition-colors text-sm font-medium"
              >
                <Award className="w-4 h-4" />
                <span>Review IPR</span>
              </Link>
            )}
            {allPermissionKeys.includes('view_students') && (
              <Link 
                href="/students"
                className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors text-sm font-medium"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Students</span>
              </Link>
            )}
            {allPermissionKeys.includes('view_faculty') && (
              <Link 
                href="/faculty"
                className="flex items-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-purple-700 transition-colors text-sm font-medium"
              >
                <Users className="w-4 h-4" />
                <span>Faculty</span>
              </Link>
            )}
            {(allPermissionKeys.includes('ipr_approve') || allPermissionKeys.includes('approve_ipr')) && (
              <Link 
                href="/ipr/dean-approval"
                className="flex items-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 transition-colors text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                <span>Dean Approval</span>
              </Link>
            )}
            {(allPermissionKeys.includes('process_incentive') || allPermissionKeys.includes('finance_ipr')) && (
              <Link 
                href="/ipr/finance"
                className="flex items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 transition-colors text-sm font-medium"
              >
                <DollarSign className="w-4 h-4" />
                <span>Finance</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}