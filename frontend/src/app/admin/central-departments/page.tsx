import ProtectedRoute from '@/components/ProtectedRoute';
import CentralDepartmentManagement from '@/components/admin/CentralDepartmentManagement';

export default function CentralDepartmentsPage() {
  return (
    <ProtectedRoute>
      <CentralDepartmentManagement />
    </ProtectedRoute>
  );
}
