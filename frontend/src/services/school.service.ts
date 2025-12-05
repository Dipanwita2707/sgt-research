import api from '@/lib/api';

export interface School {
  id: string;
  facultyCode: string;
  facultyName: string;
  facultyType: 'engineering' | 'management' | 'arts' | 'science' | 'medical' | 'law' | 'other';
  shortName?: string;
  description?: string;
  establishedYear?: number;
  headOfFacultyId?: string;
  contactEmail?: string;
  contactPhone?: string;
  officeLocation?: string;
  websiteUrl?: string;
  isActive: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  headOfFaculty?: {
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
  _count?: {
    departments: number;
  };
  departments?: Array<{
    id: string;
    departmentCode: string;
    departmentName: string;
    shortName?: string;
    isActive: boolean;
  }>;
}

export interface CreateSchoolDto {
  facultyCode: string;
  facultyName: string;
  facultyType: string;
  shortName?: string;
  description?: string;
  establishedYear?: number;
  headOfFacultyId?: string;
  contactEmail?: string;
  contactPhone?: string;
  officeLocation?: string;
  websiteUrl?: string;
  metadata?: any;
}

export interface UpdateSchoolDto extends Partial<CreateSchoolDto> {}

class SchoolService {
  private baseUrl = '/schools';

  async getAllSchools(params?: { isActive?: boolean; facultyType?: string }) {
    const response = await api.get<{ success: boolean; data: School[] }>(this.baseUrl, { params });
    return response.data;
  }

  async getSchoolById(id: string) {
    const response = await api.get<{ success: boolean; data: School }>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async createSchool(data: CreateSchoolDto) {
    const response = await api.post<{ success: boolean; message: string; data: School }>(
      this.baseUrl,
      data
    );
    return response.data;
  }

  async updateSchool(id: string, data: UpdateSchoolDto) {
    const response = await api.put<{ success: boolean; message: string; data: School }>(
      `${this.baseUrl}/${id}`,
      data
    );
    return response.data;
  }

  async deleteSchool(id: string) {
    const response = await api.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async toggleSchoolStatus(id: string) {
    const response = await api.patch<{ success: boolean; message: string; data: School }>(
      `${this.baseUrl}/${id}/toggle-status`
    );
    return response.data;
  }
}

export const schoolService = new SchoolService();
