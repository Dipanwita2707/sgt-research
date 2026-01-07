'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import GrantIncentivePolicyManagement from '@/components/admin/GrantIncentivePolicyManagement';

export default function GrantPoliciesPage() {
  return (
    <ProtectedRoute>
      <GrantIncentivePolicyManagement />
    </ProtectedRoute>
  );
}
