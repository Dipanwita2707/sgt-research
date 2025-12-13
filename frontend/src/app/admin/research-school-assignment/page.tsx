import ProtectedRoute from '@/components/ProtectedRoute';
import DrdResearchSchoolAssignment from '@/components/admin/DrdResearchSchoolAssignment';

export default function ResearchSchoolAssignmentPage() {
  return (
    <ProtectedRoute>
      <DrdResearchSchoolAssignment />
    </ProtectedRoute>
  );
}
