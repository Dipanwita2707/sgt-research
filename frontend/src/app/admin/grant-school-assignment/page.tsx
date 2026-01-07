'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DrdGrantSchoolAssignment from '@/components/admin/DrdGrantSchoolAssignment';

export default function GrantSchoolAssignmentPage() {
  return (
    <ProtectedRoute>
      <DrdGrantSchoolAssignment />
    </ProtectedRoute>
  );
}
