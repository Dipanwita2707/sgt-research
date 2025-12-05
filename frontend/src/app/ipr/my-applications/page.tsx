import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import MyIprApplications from '@/components/ipr/MyIprApplications';

export default function MyApplicationsPage() {
  return (
    <ProtectedRoute>
      <MyIprApplications />
    </ProtectedRoute>
  );
}
