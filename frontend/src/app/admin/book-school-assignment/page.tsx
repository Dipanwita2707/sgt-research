import ProtectedRoute from '@/components/ProtectedRoute';
import DrdBookSchoolAssignment from '@/components/admin/DrdBookSchoolAssignment';

export default function BookSchoolAssignmentPage() {
  return (
    <ProtectedRoute>
      <DrdBookSchoolAssignment />
    </ProtectedRoute>
  );
}
