'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DrdIprDashboard from '@/components/drd/DrdIprDashboard';

export default function DrdIprPage() {
  return (
    <ProtectedRoute>
      <DrdIprDashboard />
    </ProtectedRoute>
  );
}