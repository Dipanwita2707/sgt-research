'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import IncentivePolicyManagement from '@/components/admin/IncentivePolicyManagement';

export default function IncentivePoliciesPage() {
  return (
    <ProtectedRoute>
      <IncentivePolicyManagement />
    </ProtectedRoute>
  );
}
