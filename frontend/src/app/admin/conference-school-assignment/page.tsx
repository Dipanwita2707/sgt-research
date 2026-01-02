import ProtectedRoute from '@/components/ProtectedRoute';
import DrdConferenceSchoolAssignment from '@/components/admin/DrdConferenceSchoolAssignment';

export default function ConferenceSchoolAssignmentPage() {
  return (
    <ProtectedRoute>
      <DrdConferenceSchoolAssignment />
    </ProtectedRoute>
  );
}
