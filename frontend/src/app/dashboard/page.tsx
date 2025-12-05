'use client';

import { useAuthStore } from '@/store/authStore';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('Dashboard - User:', user);
    console.log('Dashboard - isLoading:', isLoading);
    console.log('Dashboard - userType:', user?.userType);
  }, [user, isLoading]);

  if (isLoading) {
    console.log('Dashboard - Showing loading spinner');
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    console.log('Dashboard - No user, redirecting...');
    return <LoadingSpinner fullScreen />;
  }

  console.log('Dashboard - Rendering for userType:', user.userType);

  // Route to appropriate dashboard based on user type
  if (user?.userType === 'student') {
    return <StudentDashboard />;
  }

  // Staff and admin use the staff dashboard
  return <StaffDashboard />;
}
