import { create } from 'zustand';
import { dashboardService, Module, Permission } from '@/services/dashboard.service';

interface DashboardState {
  modules: Module[];
  permissions: Record<string, Permission[]>;
  isLoading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  getModulePermissions: (moduleSlug: string) => Permission[];
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  modules: [],
  permissions: {},
  isLoading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await dashboardService.getDashboardData();
      set({ modules: data.modules, permissions: data.permissions, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load dashboard data', isLoading: false });
    }
  },

  hasPermission: (permissionKey: string) => {
    const { permissions } = get();
    return Object.values(permissions)
      .flat()
      .some((perm) => perm.key === permissionKey);
  },

  getModulePermissions: (moduleSlug: string) => {
    const { permissions } = get();
    return permissions[moduleSlug] || [];
  },
}));
