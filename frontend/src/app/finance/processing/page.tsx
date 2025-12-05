import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import FinanceDashboard from '@/components/ipr/FinanceDashboard';

export default function FinancePage() {
  return (
    <ProtectedRoute>
      <FinanceDashboard />
    </ProtectedRoute>
  );
}
