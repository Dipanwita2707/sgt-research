'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  FileText, 
  Search, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Users,
  Award,
  BarChart3,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface DRDPermissions {
  canViewAllIPR: boolean;
  canViewOwnIPR: boolean;
  canFileIPR: boolean;
  canEditOwnIPR: boolean;
  canEditAllIPR: boolean;
  canReviewIPR: boolean;
  canRecommendIPR: boolean;
  canApproveIPR: boolean;
  canDeleteIPR: boolean;
  canViewAnalytics: boolean;
  canGenerateReports: boolean;
  canSystemAdmin: boolean;
  canAssignSchools?: boolean;
}

interface IPRStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  myApplications: number;
}

interface RecentApplication {
  id: string;
  title: string;
  type: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
  applicantId?: string;
}

export default function DRDDashboardPage() {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<DRDPermissions>({
    canViewAllIPR: false,
    canViewOwnIPR: false,
    canFileIPR: false,
    canEditOwnIPR: false,
    canEditAllIPR: false,
    canReviewIPR: false,
    canRecommendIPR: false,
    canApproveIPR: false,
    canDeleteIPR: false,
    canViewAnalytics: false,
    canGenerateReports: false,
    canSystemAdmin: false,
  });
  const [stats, setStats] = useState<IPRStats>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    myApplications: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDRDData();
  }, []);

  const fetchDRDData = async () => {
    try {
      // Fetch user permissions
      const permResponse = await api.get('/dashboard/staff');
      if (permResponse.data.success) {
        const userPerms = permResponse.data.data.permissions || [];
        console.log('Staff dashboard permissions:', userPerms);
        
        // Find DRD permissions
        const drdPerms = userPerms.find((p: any) => 
          p.category.toLowerCase().includes('drd') || 
          p.category.toLowerCase().includes('development') ||
          p.category.toLowerCase().includes('research')
        );
        
        console.log('Found DRD permissions:', drdPerms);
        
        if (drdPerms && Array.isArray(drdPerms.permissions)) {
          setPermissions(extractDRDPermissions(drdPerms.permissions));
        }
      }

      // Fetch IPR statistics
      const statsResponse = await api.get('/ipr/stats');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Fetch recent applications based on permissions
      const applicationsResponse = await api.get('/ipr/?limit=5');
      if (applicationsResponse.data.success) {
        setRecentApplications(applicationsResponse.data.data);
      }

    } catch (error) {
      console.error('Error fetching DRD data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractDRDPermissions = (perms: string[]): DRDPermissions => {
    console.log('Extracting DRD permissions from:', perms);
    
    // Role-based defaults: Faculty/Student can file IPR by default
    const isFacultyOrStudent = user?.role?.name === 'faculty' || user?.role?.name === 'student';
    
    // Simplified 4 permission model
    const hasIprFile = perms.includes('ipr_file_new') || 
                       perms.some(p => p.toLowerCase().includes('ipr_file') || p.toLowerCase().includes('file') && p.toLowerCase().includes('ipr'));
    const hasIprReview = perms.includes('ipr_review') || 
                         perms.some(p => p.toLowerCase() === 'ipr_review');
    const hasIprApprove = perms.includes('ipr_approve') || 
                          perms.some(p => p.toLowerCase() === 'ipr_approve');
    const hasIprAssignSchool = perms.includes('ipr_assign_school') || 
                               perms.some(p => p.toLowerCase() === 'ipr_assign_school');
    
    return {
      canViewAllIPR: hasIprReview || hasIprApprove || hasIprAssignSchool,
      canViewOwnIPR: isFacultyOrStudent || hasIprFile,
      canFileIPR: isFacultyOrStudent || hasIprFile,  // Faculty/Student can file by default
      canEditOwnIPR: isFacultyOrStudent || hasIprFile,
      canEditAllIPR: false,  // No longer a separate permission
      canReviewIPR: hasIprReview,
      canRecommendIPR: hasIprReview,  // Review permission includes recommend
      canApproveIPR: hasIprApprove,
      canDeleteIPR: false,  // No longer a separate permission
      canViewAnalytics: hasIprApprove,  // DRD Head can view analytics
      canGenerateReports: hasIprApprove,  // DRD Head can generate reports
      canSystemAdmin: false,  // No longer needed
      canAssignSchools: hasIprAssignSchool,  // DRD Head can assign schools
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'under_review': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Development & Research Department
        </h1>
        <p className="text-gray-600">
          Manage IPR applications, research projects, and development initiatives
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {(permissions.canViewAllIPR || permissions.canViewOwnIPR) && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total IPR Applications</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                  <p className="text-xs text-gray-500 mt-1">All time submissions</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                 onClick={() => window.location.href = '/drd/review'}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
                  <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.underReview}</p>
                  <p className="text-xs text-blue-600 mt-1">In process</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
                  <p className="text-xs text-green-600 mt-1">Successfully processed</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* IPR Management Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">IPR Management</h2>
          <div className="space-y-3">
            {permissions.canFileIPR && (
              <Link
                href="/ipr/apply"
                className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
              >
                <div className="flex items-center">
                  <Plus className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-blue-900">File New IPR Application</p>
                    <p className="text-sm text-blue-700">Submit patent, copyright, or trademark</p>
                  </div>
                </div>
              </Link>
            )}

            {(permissions.canViewAllIPR || permissions.canViewOwnIPR) && (
              <Link
                href={permissions.canViewAllIPR ? "/ipr/all-applications" : "/ipr/my-applications"}
                className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
              >
                <div className="flex items-center">
                  <Eye className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-900">
                      {permissions.canViewAllIPR ? 'All IPR Applications' : 'My IPR Applications'}
                    </p>
                    <p className="text-sm text-green-700">View and manage applications</p>
                  </div>
                </div>
              </Link>
            )}

            {permissions.canReviewIPR && (
              <Link
                href="/drd/review"
                className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
              >
                <div className="flex items-center">
                  <Search className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-purple-900">Review IPR Applications</p>
                    <p className="text-sm text-purple-700">Review and provide feedback</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Analytics & Reports */}
        {(permissions.canViewAnalytics || permissions.canGenerateReports) && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics & Reports</h2>
            <div className="space-y-3">
              {permissions.canViewAnalytics && (
                <Link
                  href="/drd/analytics"
                  className="flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                >
                  <div className="flex items-center">
                    <BarChart3 className="w-5 h-5 text-indigo-600 mr-3" />
                    <div>
                      <p className="font-medium text-indigo-900">IPR Analytics Dashboard</p>
                      <p className="text-sm text-indigo-700">View trends and insights</p>
                    </div>
                  </div>
                </Link>
              )}

              {permissions.canGenerateReports && (
                <Link
                  href="/drd/reports"
                  className="flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                >
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-orange-600 mr-3" />
                    <div>
                      <p className="font-medium text-orange-900">Generate Reports</p>
                      <p className="text-sm text-orange-700">Create detailed IPR reports</p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Applications */}
      {(permissions.canViewAllIPR || permissions.canViewOwnIPR) && recentApplications.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
              <Link
                href={permissions.canViewAllIPR ? "/ipr/all-applications" : "/ipr/my-applications"}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg border ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{app.title}</p>
                      <p className="text-sm text-gray-600">
                        {app.type} • Submitted by {app.submittedBy}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {permissions.canEditAllIPR && (
                      <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {permissions.canDeleteIPR && (
                      <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Default Actions for Users Without Specific Permissions */}
      {!Object.values(permissions).some(Boolean) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic IPR Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">IPR Information</h2>
            <div className="space-y-3">
              <Link
                href="/ipr"
                className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-blue-900">View IPR Guidelines</p>
                    <p className="text-sm text-blue-700">Learn about intellectual property processes</p>
                  </div>
                </div>
              </Link>
              
              <Link
                href="/ipr/my-applications"
                className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
              >
                <div className="flex items-center">
                  <Eye className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-900">My Applications</p>
                    <p className="text-sm text-green-700">View your submitted applications</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Access?</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-3">
                If you need access to DRD management features, please contact your administrator.
              </p>
              <div className="text-sm text-gray-600">
                <p><strong>DRD Department:</strong> drd@sgtuniversity.org</p>
                <p><strong>Admin Support:</strong> admin@sgtuniversity.org</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
