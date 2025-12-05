import api from '@/lib/api';

export interface Permission {
  id: string;
  permission_key: string;
  permission_name: string;
  description: string;
  module_name: string;
  module_slug: string;
  is_default_student?: boolean;
  is_default_staff?: boolean;
}

export interface UserPermission extends Permission {
  granted_at: string;
  granted_by_username?: string;
}

class PermissionService {
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const response = await api.get(`/permissions/user/${userId}`);
    return response.data.data;
  }

  async getAllPermissions(moduleId?: string): Promise<Permission[]> {
    const params = moduleId ? { moduleId } : {};
    const response = await api.get('/permissions/all', { params });
    return response.data.data;
  }

  async grantPermissions(userId: string, permissionIds: string[]): Promise<void> {
    await api.post('/permissions/grant', { userId, permissionIds });
  }

  async revokePermissions(userId: string, permissionIds: string[]): Promise<void> {
    await api.post('/permissions/revoke', { userId, permissionIds });
  }

  async updateUserPermissions(userId: string, permissionIds: string[]): Promise<void> {
    await api.put('/permissions/update', { userId, permissionIds });
  }
}

export const permissionService = new PermissionService();
