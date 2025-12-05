import ProtectedRoute from '@/components/ProtectedRoute';
import PermissionManagement from '@/components/admin/PermissionManagement';

export default function PermissionsPage() {
  return (
    <ProtectedRoute>
      <PermissionManagement />
    </ProtectedRoute>
  );
}
