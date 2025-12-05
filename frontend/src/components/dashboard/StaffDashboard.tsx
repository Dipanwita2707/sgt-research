'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Briefcase, 
  Shield, 
  Clock, 
  Award, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar,
  ArrowUpRight,
  Sparkles,
  Building,
  ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import PermissionBasedDashboard from './PermissionBasedDashboard';
import Link from 'next/link';

interface StaffStats {
  department: string;
  designation: string;
  faculty: string;
  permissions: Array<{
    category: string;
    permissions: string[];
  }>;
  activeStudents?: number;
  coursesAssigned?: number;
  pendingApprovals?: number;
  departmentStrength?: number;
}

export default function StaffDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchStaffData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchStaffData = async () => {
    try {
      const response = await api.get('/dashboard/staff');
      const data = response.data.data;
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
      setStats({
        department: 'N/A',
        designation: 'N/A',
        faculty: 'N/A',
        permissions: [],
        activeStudents: 0,
        coursesAssigned: 0,
        pendingApprovals: 0,
        departmentStrength: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-sgt-100 rounded-full animate-spin border-t-sgt-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-sgt-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.userType === 'admin' || user?.role?.name === 'admin';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden bg-sgt-gradient rounded-3xl p-8 text-white shadow-sgt-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-6 lg:mb-0">
              {/* Avatar */}
              <div className="relative mr-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-lg flex items-center justify-center border-2 border-white">
                  <span className="text-white text-[10px]">✓</span>
                </div>
              </div>
              
              {/* Greeting */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-sgt-50" />
                  <span className="text-sgt-50 text-sm font-medium">{formatTime()}</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-1">
                  {getUserGreeting()}, {user?.firstName || user?.username}!
                </h1>
                <p className="text-sgt-100 text-lg">
                  {isAdmin ? 'Administrator Dashboard' : 'Welcome to your Staff Portal'}
                </p>
              </div>
            </div>

            {/* Quick Action - Link to Dashboard Modules */}
            <div className="flex gap-3">
              <a 
                href="#modules" 
                className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">View Modules</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Building className="w-5 h-5" />
                </div>
                <TrendingUp className="w-4 h-4 text-sgt-50" />
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">Department</p>
              <p className="text-lg font-bold mt-1 truncate">{stats?.department || 'N/A'}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <Sparkles className="w-4 h-4 text-sgt-50" />
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">Designation</p>
              <p className="text-lg font-bold mt-1 truncate">{stats?.designation || user?.employee?.designation || 'N/A'}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Active</span>
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">Departments</p>
              <p className="text-3xl font-bold mt-1">{stats?.permissions?.length || 0}</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-sgt-50" />
              </div>
              <p className="text-sgt-100 text-xs font-medium uppercase tracking-wider">Faculty</p>
              <p className="text-lg font-bold mt-1 truncate">{stats?.faculty || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sgt border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Today's Overview</h2>
              <p className="text-sm text-gray-500 mt-1">Your daily activity summary</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-sgt-50 to-white rounded-xl border border-sgt-100">
              <div className="w-10 h-10 bg-sgt-600 rounded-xl flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-sgt-900">{stats?.pendingApprovals || 0}</p>
              <p className="text-xs text-gray-500 font-medium">Pending Tasks</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-emerald-900">{stats?.activeStudents || 0}</p>
              <p className="text-xs text-gray-500 font-medium">Active Students</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100">
              <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-amber-900">{stats?.coursesAssigned || 0}</p>
              <p className="text-xs text-gray-500 font-medium">Courses</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats?.departmentStrength || 0}</p>
              <p className="text-xs text-gray-500 font-medium">Dept. Strength</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
          <div className="space-y-3">
            <Link 
              href="/notifications" 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-white rounded-xl border border-amber-100 hover:border-amber-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-600 rounded-lg">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-gray-900">Notifications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
            </Link>
            
            <Link 
              href="/settings" 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-600 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-gray-900">Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Permission-based Dashboard */}
      <div id="modules" className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Modules</h2>
          <p className="text-sm text-gray-500 mt-1">Access your assigned modules and features</p>
        </div>
        <PermissionBasedDashboard 
          userPermissions={stats?.permissions || []} 
          userRole={user?.role?.name || 'staff'}
        />
      </div>
    </div>
  );
}
