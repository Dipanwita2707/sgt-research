'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Users, 
  School,
  Building,
  Award,
  TrendingUp,
  BookOpen,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import api from '@/lib/api';
import HeroSection from './HeroSection';
import AnimatedStatsGrid from './AnimatedStatsGrid';
import QuickAccessModules from './QuickAccessModules';
import UniversityEventsSlideshow from './UniversityEventsSlideshow';
import PermissionBasedDashboard from './PermissionBasedDashboard';
import Footer from '../layouts/Footer';
import { FadeInUp } from '../animations/AnimatedComponents';

interface StaffStats {
  department: string;
  designation: string;
  faculty: string;
  permissions: Array<{
    category: string;
    permissions: string[];
  }>;
}

interface AdminOverview {
  university: {
    schools: { total: number; active: number };
    departments: { total: number; active: number };
    programmes: { total: number };
  };
  users: {
    employees: { total: number; active: number };
    students: { total: number; active: number };
  };
  ipr: {
    total: number;
    approved: number;
    pending: number;
  };
}

export default function ModernStaffDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.userType === 'admin' || user?.role?.name === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const staffResponse = await api.get('/dashboard/staff');
      setStats(staffResponse.data.data);

      if (user?.userType === 'admin' || user?.role?.name === 'admin') {
        try {
          const overviewResponse = await api.get('/analytics/overview');
          if (overviewResponse.data.success) {
            setAdminOverview(overviewResponse.data.data);
          }
        } catch (err) {
          console.log('Analytics not available');
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setStats({
        department: 'N/A',
        designation: 'N/A',
        faculty: 'N/A',
        permissions: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) return user.firstName;
    return user?.username || 'User';
  };

  const getUserType = () => {
    if (isAdmin) return 'Administrator';
    if (user?.userType === 'faculty') return 'Faculty';
    return 'Staff';
  };

  // Prepare stats for the animated grid
  const getStatsData = () => {
    if (isAdmin && adminOverview) {
      const totalUsers = (adminOverview.users.employees.total || 0) + (adminOverview.users.students.total || 0);
      const totalSchools = adminOverview.university.schools.total || 0;
      const totalDepartments = adminOverview.university.departments.total || 0;
      const pendingIPR = adminOverview.ipr.pending || 0;

      return [
        {
          title: 'Total Users',
          value: totalUsers,
          icon: Users,
          color: 'from-blue-500 to-cyan-500',
          change: '+12%',
          changeType: 'increase' as const,
        },
        {
          title: 'Schools',
          value: totalSchools,
          icon: School,
          color: 'from-green-500 to-emerald-500',
          progress: 85,
        },
        {
          title: 'Departments',
          value: totalDepartments,
          icon: Building,
          color: 'from-purple-500 to-pink-500',
          progress: 92,
        },
        {
          title: 'Pending IPR',
          value: pendingIPR,
          icon: Award,
          color: 'from-orange-500 to-red-500',
          change: '-5%',
          changeType: 'decrease' as const,
        },
      ];
    }

    // Default stats for staff/faculty
    return [
      {
        title: 'My IPR Applications',
        value: 8,
        icon: Award,
        color: 'from-blue-500 to-cyan-500',
        progress: 75,
      },
      {
        title: 'Published Work',
        value: 12,
        icon: BookOpen,
        color: 'from-green-500 to-emerald-500',
        change: '+3',
        changeType: 'increase' as const,
      },
      {
        title: 'Incentives Earned',
        value: '₹45,000',
        icon: DollarSign,
        color: 'from-purple-500 to-pink-500',
        change: '+15%',
        changeType: 'increase' as const,
      },
      {
        title: 'Pending Tasks',
        value: 5,
        icon: CheckCircle,
        color: 'from-orange-500 to-red-500',
      },
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Animated Hero Section */}
      <HeroSection 
        userName={getUserName()} 
        userType={getUserType()}
      />

      {/* Quick Access Modules (LMS & RFID) */}
      <FadeInUp delay={0.3}>
        <QuickAccessModules />
      </FadeInUp>

      {/* University Events Slideshow */}
      <UniversityEventsSlideshow />

      {/* Animated Stats Grid */}
      <FadeInUp delay={0.5}>
        <AnimatedStatsGrid stats={getStatsData()} />
      </FadeInUp>

      {/* Permission-Based Dashboard (Existing Widgets) */}
      <FadeInUp delay={0.7}>
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Modules</h2>
          <PermissionBasedDashboard 
            userPermissions={stats?.permissions || []}
            userRole={user?.role?.name || user?.userType || 'staff'}
          />
        </div>
      </FadeInUp>

      {/* Footer - Only on Main Dashboard */}
      <Footer />
    </div>
  );
}
