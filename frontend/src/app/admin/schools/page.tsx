import ProtectedRoute from '@/components/ProtectedRoute';
import SchoolManagement from '@/components/admin/SchoolManagement';

export default function SchoolsPage() {
  return (
    <ProtectedRoute>
      <SchoolManagement />
    </ProtectedRoute>
  );
}
