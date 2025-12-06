'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { permissionManagementService } from '@/services/permissionManagement.service';
import { drdReviewService, iprService } from '@/services/ipr.service';
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
  Plus,
  UserCheck
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
  const [pendingMentorApprovals, setPendingMentorApprovals] = useState<any[]>([]);
  const [mentorLoading, setMentorLoading] = useState(false);

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
      // Fetch mentor approvals for faculty
      if (user?.userType === 'faculty') {
        fetchMentorApprovals();
      }
    }
  }, [user]);

  const fetchMentorApprovals = async () => {
    try {
      setMentorLoading(true);
      const data = await iprService.getPendingMentorApprovals();
      setPendingMentorApprovals(data || []);
    } catch (error) {
      console.log('Not a mentor or no pending approvals');
      setPendingMentorApprovals([]);
    } finally {
      setMentorLoading(false);
    }
  };

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
      // Fetch real statistics from the API
      const statistics = await drdReviewService.getStatistics();
      setStats({
        pendingReviews: statistics.pendingApplications || 0,
        pendingApprovals: statistics.pendingHeadApproval || 0,
        activeProjects: statistics.activeApplications || 0,
        totalPublications: statistics.completedApplications || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default values of 0 on error
    }
  };

  // Simplified 4-permission system
  const hasViewPermission = (category: string) => {
    // Based on new 4 permissions: ipr_file_new, ipr_review, ipr_approve, ipr_assign_school
    // NOTE: ipr_file_new is NOT a DRD permission - it's a general filing permission
    // DRD dashboard cards should only show for DRD-specific permissions (ipr_review, ipr_approve, ipr_assign_school)
    const viewPermissionKeys: Record<string, string[]> = {
      'IPR Review & Management': ['ipr_review', 'ipr_approve'],  // Only DRD members/head can see this
      'School Assignment': ['ipr_assign_school'],
      'Analytics & Reports': ['ipr_approve'],  // Only DRD Head can view analytics
    };
    
    const requiredPerms = viewPermissionKeys[category] || [];
    return requiredPerms.some(perm => userPermissions[perm]);
  };

  const getActionPermissions = (category: string) => {
    // Simplified 4-permission action map
    // NOTE: ipr_file_new is shown separately in Quick Actions, not in category cards
    const actionPermissionMap: Record<string, string[]> = {
      'IPR Review & Management': ['ipr_review', 'ipr_approve'],  // Only DRD permissions
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
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#005b96] flex items-center justify-center">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            DRD Dashboard
          </h1>
        </div>
        <p className="text-gray-500 text-sm">
          Research management, IPR applications, grants, and publications
        </p>
      </div>

      {/* Quick Stats - LMS Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border-l-4 border-[#e74c3c] shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Reviews</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.pendingReviews}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#fdeaea] flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#e74c3c]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border-l-4 border-[#f39c12] shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.pendingApprovals}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#fef5e7] flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#f39c12]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border-l-4 border-[#005b96] shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Applications</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.activeProjects}</p>
              <p className="text-xs text-gray-400 mt-1">In pipeline</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#e6f2fa] flex items-center justify-center">
              <Beaker className="w-6 h-6 text-[#005b96]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border-l-4 border-[#27ae60] shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Approved</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalPublications}</p>
              <p className="text-xs text-gray-400 mt-1">Completed applications</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#e8f8ef] flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#27ae60]" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Based on Permissions */}
      {(userPermissions.ipr_file_new || userPermissions.ipr_review || userPermissions.ipr_assign_school) && (
        <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#005b96]" />
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {userPermissions.ipr_file_new && (
              <Link
                href="/ipr/apply"
                className="flex items-center gap-2 px-5 py-3 bg-[#005b96] text-white rounded-xl hover:bg-[#03396c] hover:shadow-lg transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                File New IPR Application
              </Link>
            )}
            {userPermissions.ipr_file_new && (
              <Link
                href="/ipr/my-applications"
                className="flex items-center gap-2 px-5 py-3 bg-[#e6f2fa] text-[#005b96] border border-[#b3d4fc] rounded-xl hover:bg-[#d4e9f7] transition-all font-medium"
              >
                <FolderOpen className="w-4 h-4" />
                My Applications
              </Link>
            )}
            {userPermissions.ipr_review && (
              <Link
                href="/drd/review"
                className="flex items-center gap-2 px-5 py-3 bg-[#e6f2fa] text-[#005b96] border border-[#b3d4fc] rounded-xl hover:bg-[#d4e9f7] transition-all font-medium"
              >
                <FileText className="w-4 h-4" />
                Review Applications
              </Link>
            )}
            {userPermissions.ipr_assign_school && (
              <Link
                href="/admin/drd-school-assignment"
                className="flex items-center gap-2 px-5 py-3 bg-[#e6f2fa] text-[#005b96] border border-[#b3d4fc] rounded-xl hover:bg-[#d4e9f7] transition-all font-medium"
              >
                <Users className="w-4 h-4" />
                Assign Schools
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Mentor Approvals Section - Only for faculty with pending approvals */}
      {user?.userType === 'faculty' && pendingMentorApprovals.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-500" />
              Pending Mentor Approvals
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                {pendingMentorApprovals.length}
              </span>
            </h2>
            <Link
              href="/ipr/mentor-approvals"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Students have selected you as their mentor for the following IPR applications. Please review and approve or request changes.
          </p>
          <div className="space-y-3">
            {pendingMentorApprovals.slice(0, 5).map((app: any) => (
              <div key={app.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{app.title}</h3>
                  <p className="text-sm text-gray-500">
                    {app.iprType?.toUpperCase()} • {app.applicationNumber || 'Pending Number'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted by: {app.applicantUser?.studentLogin?.displayName || app.applicantUser?.studentLogin?.firstName || 'Student'}
                  </p>
                </div>
                <Link
                  href={`/ipr/mentor-approvals?id=${app.id}`}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
          {pendingMentorApprovals.length > 5 && (
            <div className="mt-4 text-center">
              <Link
                href="/ipr/mentor-approvals"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                View all {pendingMentorApprovals.length} pending approvals →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Permission-based Navigation Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {permissionCategories.map((categoryInfo) => {
          const hasView = hasViewPermission(categoryInfo.category);
          const actionPermissions = getActionPermissions(categoryInfo.category);
          
          if (!hasView && actionPermissions.length === 0) {
            return null; // Hide section if no permissions
          }

          const colorMap: Record<string, { bg: string; border: string; iconBg: string; text: string }> = {
            'blue': { bg: '#e6f2fa', border: '#005b96', iconBg: '#005b96', text: '#005b96' },
            'amber': { bg: '#fef5e7', border: '#f39c12', iconBg: '#f39c12', text: '#f39c12' },
            'green': { bg: '#e8f8ef', border: '#27ae60', iconBg: '#27ae60', text: '#27ae60' },
          };
          const colors = colorMap[categoryInfo.color] || colorMap['blue'];

          return (
            <div
              key={categoryInfo.category}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              <div className="h-1" style={{ backgroundColor: colors.border }}></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: colors.iconBg }}>
                      <div className="text-white">{categoryInfo.icon}</div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">
                        {categoryInfo.category}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {hasView ? 'Full access' : 'Limited access'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Access Level Indicator */}
                <div className="mb-4">
                  {hasView ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#e8f8ef] text-[#27ae60]">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Dashboard Access
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <XCircle className="w-3 h-3 mr-1" />
                      No Dashboard Access
                    </span>
                  )}
                </div>

                {/* Available Actions */}
                {actionPermissions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Available Actions:</p>
                    <div className="space-y-1">
                      {actionPermissions.map((permission) => (
                        <div key={permission} className="text-xs text-gray-600 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-2 text-[#27ae60]" />
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
                    className="mt-2 w-full px-4 py-2.5 text-white rounded-xl transition-colors flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: colors.border }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Access {categoryInfo.category.split(' ')[0]}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No DRD Permissions Message - Show when user only has filing permission or no permissions */}
      {!userPermissions.ipr_review && !userPermissions.ipr_approve && !userPermissions.ipr_assign_school && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-[#e6f2fa] mx-auto flex items-center justify-center">
            <Shield className="h-8 w-8 text-[#005b96]" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-800">No DRD Review Permissions</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            {userPermissions.ipr_file_new 
              ? 'You can file IPR applications but do not have DRD review permissions. Use the IPR Dashboard for filing and tracking your applications.'
              : "You don't have any DRD permissions assigned. Contact your administrator to request access."
            }
          </p>
          {userPermissions.ipr_file_new && (
            <Link
              href="/ipr"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#005b96] text-white rounded-xl hover:bg-[#03396c] transition-all font-medium"
            >
              <FileText className="w-4 h-4" />
              Go to IPR Dashboard
            </Link>
          )}
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