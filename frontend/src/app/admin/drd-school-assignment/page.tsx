import ProtectedRoute from '@/components/ProtectedRoute';
import DrdMemberSchoolAssignment from '@/components/admin/DrdMemberSchoolAssignment';

export default function DrdSchoolAssignmentPage() {
  return (
    <ProtectedRoute>
      <DrdMemberSchoolAssignment />
    </ProtectedRoute>
  );
}
