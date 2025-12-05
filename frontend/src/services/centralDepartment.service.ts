import api from '@/lib/api';

export interface CentralDepartment {
  id: string;
  departmentCode: string;
  departmentName: string;
  shortName?: string;
  description?: string;
  headOfDepartmentId?: string;
  contactEmail?: string;
  contactPhone?: string;
  officeLocation?: string;
  departmentType?: string;
  isActive: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  headOfDepartment?: {
    id: string;
    uid: string;
    employeeDetails: {
      firstName: string;
      lastName?: string;
      displayName?: string;
      empId?: string;
      designation?: string;
    };
  };
}

export interface CreateCentralDepartmentDto {
  departmentCode: string;
  departmentName: string;
  shortName?: string;
  description?: string;
  headOfDepartmentId?: string;
  contactEmail?: string;
  contactPhone?: string;
  officeLocation?: string;
  departmentType?: string;
  metadata?: any;
}

export interface UpdateCentralDepartmentDto extends Partial<CreateCentralDepartmentDto> {}

class CentralDepartmentService {
  private baseUrl = '/central-departments';

  async getAllCentralDepartments(params?: { isActive?: boolean; departmentType?: string }) {
    const response = await api.get<{ success: boolean; data: CentralDepartment[] }>(this.baseUrl, {
      params,
    });
    return response.data;
  }

  async getCentralDepartmentById(id: string) {
    const response = await api.get<{ success: boolean; data: CentralDepartment }>(
      `${this.baseUrl}/${id}`
    );
    return response.data;
  }

  async createCentralDepartment(data: CreateCentralDepartmentDto) {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: CentralDepartment;
    }>(this.baseUrl, data);
    return response.data;
  }

  async updateCentralDepartment(id: string, data: UpdateCentralDepartmentDto) {
    const response = await api.put<{
      success: boolean;
      message: string;
      data: CentralDepartment;
    }>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteCentralDepartment(id: string) {
    const response = await api.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${id}`
    );
    return response.data;
  }

  async toggleCentralDepartmentStatus(id: string) {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: CentralDepartment;
    }>(`${this.baseUrl}/${id}/toggle-status`);
    return response.data;
  }
}

export const centralDepartmentService = new CentralDepartmentService();
