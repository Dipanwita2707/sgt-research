import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DrdReviewDashboard from '@/components/ipr/DrdReviewDashboard';

export default function DrdReviewPage() {
  return (
    <ProtectedRoute>
      <DrdReviewDashboard />
    </ProtectedRoute>
  );
}
