import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DeanApprovalDashboard from '@/components/ipr/DeanApprovalDashboard';

export default function DeanApprovalPage() {
  return (
    <ProtectedRoute>
      <DeanApprovalDashboard />
    </ProtectedRoute>
  );
}
