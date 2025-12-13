import api from '@/lib/api';

export interface QuartileBonuses {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  [key: string]: number | undefined;
}

export interface IndexingBonuses {
  scopus?: number;
  wos?: number;
  sci?: number;
  ugc?: number;
  pubmed?: number;
  ieee?: number;
  quartileBonuses?: QuartileBonuses;
  [key: string]: number | QuartileBonuses | undefined;
}

export interface ResearchIncentivePolicy {
  id: string;
  publicationType: string;
  policyName: string;
  baseIncentiveAmount: number;
  basePoints: number;
  splitPolicy: 'equal' | 'author_role_based' | 'weighted';
  primaryAuthorShare?: number;
  authorTypeMultipliers?: Record<string, number>;
  indexingBonuses?: IndexingBonuses;
  quartileBonuses?: QuartileBonuses;
  impactFactorTiers?: Array<{
    minIF: number;
    maxIF: number | null;
    bonus: number;
  }>;
  isActive: boolean;
  isDefault?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    uid: string;
    employeeDetails?: { displayName: string };
  };
  updatedBy?: {
    uid: string;
    employeeDetails?: { displayName: string };
  };
}

export interface CreateResearchPolicyData {
  publicationType: string;
  policyName: string;
  baseIncentiveAmount: number;
  basePoints: number;
  splitPolicy?: 'equal' | 'author_role_based' | 'weighted';
  primaryAuthorShare?: number;
  authorTypeMultipliers?: Record<string, number>;
  indexingBonuses?: IndexingBonuses;
  quartileBonuses?: QuartileBonuses;
  impactFactorTiers?: Array<{
    minIF: number;
    maxIF: number | null;
    bonus: number;
  }>;
  isActive?: boolean;
}

class ResearchPolicyService {
  /**
   * Get all research incentive policies (admin only)
   */
  async getAllPolicies(includeInactive = false): Promise<ResearchIncentivePolicy[]> {
    const response = await api.get('/research-policies', {
      params: { includeInactive }
    });
    return response.data.data;
  }

  /**
   * Get policy by publication type
   */
  async getPolicyByType(publicationType: string): Promise<ResearchIncentivePolicy> {
    const response = await api.get(`/research-policies/type/${publicationType}`);
    return response.data.data;
  }

  /**
   * Create a new research incentive policy (admin only)
   */
  async createPolicy(data: CreateResearchPolicyData): Promise<ResearchIncentivePolicy> {
    const response = await api.post('/research-policies', data);
    return response.data.data;
  }

  /**
   * Update an existing research incentive policy (admin only)
   */
  async updatePolicy(id: string, data: Partial<CreateResearchPolicyData>): Promise<ResearchIncentivePolicy> {
    const response = await api.put(`/research-policies/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete a research incentive policy (admin only)
   */
  async deletePolicy(id: string): Promise<void> {
    await api.delete(`/research-policies/${id}`);
  }
}

export const researchPolicyService = new ResearchPolicyService();
