import api from '@/lib/api';

export interface Module {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  route: string;
  is_active: boolean;
  display_order: number;
}

export interface Permission {
  key: string;
  name: string;
}

export interface DashboardData {
  user: any;
  modules: Module[];
  permissions: Record<string, Permission[]>;
}

class DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get('/dashboard');
    return response.data.data;
  }

  async getAvailableModules(): Promise<Module[]> {
    const response = await api.get('/dashboard/modules');
    return response.data.data;
  }
}

export const dashboardService = new DashboardService();
