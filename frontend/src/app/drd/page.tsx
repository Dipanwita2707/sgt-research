'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DrdMainDashboard from '@/components/drd/DrdMainDashboard';

export default function DrdPage() {
  return (
    <ProtectedRoute>
      <DrdMainDashboard />
    </ProtectedRoute>
  );
}