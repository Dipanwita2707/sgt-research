import api from '@/lib/api';

export interface UniversityOverview {
  university: {
    schools: { total: number; active: number };
    departments: { total: number; active: number };
    programmes: { total: number };
  };
  users: {
    employees: { total: number; active: number };
    students: { total: number; active: number };
  };
  ipr: {
    total: number;
    approved: number;
    pending: number;
  };
}

export interface SchoolStats {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  departments: number;
  employees: number;
  programmes: number;
  ipr: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
}

export interface DepartmentStats {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  school: {
    id: string;
    code: string;
    name: string;
  };
  employees: number;
  programmes: number;
  ipr: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
}

export interface IprAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byUserType: Record<string, number>;
  recentApplications: Array<{
    id: string;
    applicationNumber: string;
    title: string;
    iprType: string;
    status: string;
    createdAt: string;
    school?: { facultyCode: string; facultyName: string };
    department?: { departmentCode: string; departmentName: string };
    applicantDetails?: { applicantName: string; applicantType: string };
  }>;
}

export interface TopPerformer {
  userId: string;
  name: string;
  type: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export interface MonthlyTrend {
  month: number;
  monthName: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface AnalyticsFilters {
  schoolId?: string;
  departmentId?: string;
  userType?: string;
  dateFrom?: string;
  dateTo?: string;
  iprType?: string;
  status?: string;
  year?: number;
  limit?: number;
}

class AnalyticsService {
  private baseUrl = '/analytics';

  async getUniversityOverview(): Promise<{ success: boolean; data: UniversityOverview }> {
    const response = await api.get<{ success: boolean; data: UniversityOverview }>(
      `${this.baseUrl}/overview`
    );
    return response.data;
  }

  async getSchoolWiseStats(
    filters?: Pick<AnalyticsFilters, 'dateFrom' | 'dateTo' | 'iprType'>
  ): Promise<{ success: boolean; data: SchoolStats[] }> {
    const response = await api.get<{ success: boolean; data: SchoolStats[] }>(
      `${this.baseUrl}/schools`,
      { params: filters }
    );
    return response.data;
  }

  async getDepartmentWiseStats(
    filters?: Pick<AnalyticsFilters, 'schoolId' | 'dateFrom' | 'dateTo' | 'iprType'>
  ): Promise<{ success: boolean; data: DepartmentStats[] }> {
    const response = await api.get<{ success: boolean; data: DepartmentStats[] }>(
      `${this.baseUrl}/departments`,
      { params: filters }
    );
    return response.data;
  }

  async getIprAnalytics(filters?: AnalyticsFilters): Promise<{ success: boolean; data: IprAnalytics }> {
    const response = await api.get<{ success: boolean; data: IprAnalytics }>(
      `${this.baseUrl}/ipr`,
      { params: filters }
    );
    return response.data;
  }

  async getTopPerformers(
    filters?: Pick<AnalyticsFilters, 'schoolId' | 'departmentId' | 'dateFrom' | 'dateTo' | 'limit'>
  ): Promise<{ success: boolean; data: TopPerformer[] }> {
    const response = await api.get<{ success: boolean; data: TopPerformer[] }>(
      `${this.baseUrl}/top-performers`,
      { params: filters }
    );
    return response.data;
  }

  async getMonthlyTrend(
    filters?: Pick<AnalyticsFilters, 'schoolId' | 'departmentId' | 'year'>
  ): Promise<{ success: boolean; data: MonthlyTrend[] }> {
    const response = await api.get<{ success: boolean; data: MonthlyTrend[] }>(
      `${this.baseUrl}/monthly-trend`,
      { params: filters }
    );
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
