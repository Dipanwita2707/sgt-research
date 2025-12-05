'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { permissionManagementService } from '@/services/permissionManagement.service';
import { 
  Beaker, 
  FolderOpen, 
  BookOpen, 
  FileText, 
  Award, 
  BarChart3,
  Settings,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface DrdPermission {
  key: string;
  label: string;
  category: string;
  type: 'view' | 'action';
  description?: string;
}

interface PermissionCategory {
  category: string;
  icon: React.ReactNode;
  color: string;
  permissions: DrdPermission[];
  route?: string;
}

export default function DrdMainDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingReviews: 0,
    pendingApprovals: 0,
    activeProjects: 0,
    totalPublications: 0
  });

  // Simplified permission categories - focused on IPR workflow
  const permissionCategories: PermissionCategory[] = [
    {
      category: 'IPR Review & Management',
      icon: <FileText className="w-6 h-6" />,
      color: 'blue',
      route: '/drd/review',
      permissions: []
    },
    {
      category: 'School Assignment',
      icon: <Users className="w-6 h-6" />,
      color: 'amber',
      route: '/admin/drd-school-assignment',
      permissions: []
    },
    {
      category: 'Analytics & Reports',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'green',
      route: '/drd/analytics',
      permissions: []
    }
  ];

  useEffect(() => {
    if (user?.id) {
      fetchUserPermissions();
      fetchStats();
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      setLoading(true);
      const response = await permissionManagementService.getUserPermissions(user!.id);
      
      // Extract DRD permissions
      const drdPermissions: Record<string, boolean> = {};
      response.data.centralDepartments.forEach(dept => {
        if (dept.centralDept.departmentCode === 'DRD') {
          Object.assign(drdPermissions, dept.permissions);
        }
      });
      
      setUserPermissions(drdPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // TODO: Implement actual stats fetching from API
      setStats({
        pendingReviews: 8,
        pendingApprovals: 3,
        activeProjects: 12,
        totalPublications: 45
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Simplified 4-permission system
  const hasViewPermission = (category: string) => {
    // Based on new 4 permissions: ipr_file_new, ipr_review, ipr_approve, ipr_assign_school
    const viewPermissionKeys: Record<string, string[]> = {
      'IPR Review & Management': ['ipr_file_new', 'ipr_review', 'ipr_approve'],
      'School Assignment': ['ipr_assign_school'],
      'Analytics & Reports': ['ipr_approve'],  // Only DRD Head can view analytics
    };
    
    const requiredPerms = viewPermissionKeys[category] || [];
    return requiredPerms.some(perm => userPermissions[perm]);
  };

  const getActionPermissions = (category: string) => {
    // Simplified 4-permission action map
    const actionPermissionMap: Record<string, string[]> = {
      'IPR Review & Management': ['ipr_file_new', 'ipr_review', 'ipr_approve'],
      'School Assignment': ['ipr_assign_school'],
      'Analytics & Reports': ['ipr_approve'],
    };

    return (actionPermissionMap[category] || []).filter(
      key => userPermissions[key]
    );
  };

  const navigateToSection = (route: string) => {
    router.push(route);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DRD Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Development & Research Department (DRD)
        </h1>
        <p className="text-gray-600">
          Research management, IPR applications, grants, and publications
        </p>
        {user && (
          <div className="mt-3 text-sm text-gray-500">
            Welcome {user.employee?.displayName || user.email} | Role: {user.role?.name || 'N/A'} | UID: {user.uid}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">Pending Reviews</p>
              <p className="text-2xl font-bold">{stats.pendingReviews}</p>
            </div>
            <Clock className="w-8 h-8 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100">Pending Approvals</p>
              <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Active Projects</p>
              <p className="text-2xl font-bold">{stats.activeProjects}</p>
            </div>
            <Beaker className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Publications</p>
              <p className="text-2xl font-bold">{stats.totalPublications}</p>
            </div>
            <BookOpen className="w-8 h-8 text-green-200" />
          </div>
        </div>
      </div>

      {/* Quick Actions - Based on Permissions */}
      {(userPermissions.ipr_file_new || userPermissions.ipr_review || userPermissions.ipr_assign_school) && (
        <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {userPermissions.ipr_file_new && (
              <Link
                href="/ipr/apply"
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                File New IPR Application
              </Link>
            )}
            {userPermissions.ipr_file_new && (
              <Link
                href="/ipr/my-applications"
                className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                <FolderOpen className="w-4 h-4" />
                My Applications
              </Link>
            )}
            {userPermissions.ipr_review && (
              <Link
                href="/drd/review"
                className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                <FileText className="w-4 h-4" />
                Review Applications
              </Link>
            )}
            {userPermissions.ipr_assign_school && (
              <Link
                href="/admin/drd-school-assignment"
                className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                <Users className="w-4 h-4" />
                Assign Schools
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Permission-based Navigation Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {permissionCategories.map((categoryInfo) => {
          const hasView = hasViewPermission(categoryInfo.category);
          const actionPermissions = getActionPermissions(categoryInfo.category);
          
          if (!hasView && actionPermissions.length === 0) {
            return null; // Hide section if no permissions
          }

          return (
            <div
              key={categoryInfo.category}
              className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-${categoryInfo.color}-100 rounded-lg`}>
                      {categoryInfo.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {categoryInfo.category}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {hasView ? 'Full access' : 'Limited actions available'}
                      </p>
                    </div>
                  </div>
                  {hasView && (
                    <button
                      onClick={() => navigateToSection(categoryInfo.route!)}
                      className={`p-2 bg-${categoryInfo.color}-50 hover:bg-${categoryInfo.color}-100 rounded-lg transition-colors`}
                    >
                      <ChevronRight className={`w-5 h-5 text-${categoryInfo.color}-600`} />
                    </button>
                  )}
                </div>

                {/* Access Level Indicator */}
                <div className="mb-4">
                  {hasView ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Dashboard Access
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <XCircle className="w-3 h-3 mr-1" />
                      No Dashboard Access
                    </span>
                  )}
                </div>

                {/* Available Actions */}
                {actionPermissions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Available Actions:</p>
                    <div className="space-y-1">
                      {actionPermissions.map((permission) => (
                        <div key={permission} className="text-sm text-gray-600 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                          {getPermissionLabel(permission)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation Button */}
                {hasView && (
                  <button
                    onClick={() => navigateToSection(categoryInfo.route!)}
                    className={`mt-4 w-full px-4 py-2 bg-${categoryInfo.color}-600 text-white rounded-md hover:bg-${categoryInfo.color}-700 transition-colors flex items-center justify-center`}
                  >
                    Access {categoryInfo.category}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No Permissions Message */}
      {Object.keys(userPermissions).length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No DRD Permissions</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any DRD permissions assigned. Contact your administrator to request access.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to get readable permission labels - Simplified 4 permissions
function getPermissionLabel(permissionKey: string): string {
  const labels: Record<string, string> = {
    'ipr_file_new': 'File New IPR Applications',
    'ipr_review': 'Review IPR Applications',
    'ipr_approve': 'Final Approve/Reject IPR',
    'ipr_assign_school': 'Assign Schools to DRD Members'
  };
  
  return labels[permissionKey] || permissionKey;
}