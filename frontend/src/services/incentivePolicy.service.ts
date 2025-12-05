import api from '@/lib/api';

export interface IncentivePolicy {
  id: string;
  iprType: string;
  policyName: string;
  baseIncentiveAmount: number;
  basePoints: number;
  splitPolicy: 'equal' | 'weighted' | 'primary_inventor';
  primaryInventorShare?: number;
  filingTypeMultiplier?: Record<string, number>;
  projectTypeBonus?: Record<string, number>;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    uid: string;
    employeeDetails?: { displayName: string };
  };
  updatedBy?: {
    uid: string;
    employeeDetails?: { displayName: string };
  };
}

export interface IncentiveCalculation {
  totalIncentive: number;
  totalPoints: number;
  perInventorIncentive: number;
  perInventorPoints: number;
  inventorCount: number;
  splitPolicy: string;
  policyApplied: boolean;
}

class IncentivePolicyService {
  async getAllPolicies(includeInactive = false): Promise<IncentivePolicy[]> {
    const response = await api.get<{ success: boolean; data: IncentivePolicy[] }>(
      `/incentive-policies?includeInactive=${includeInactive}`
    );
    return response.data.data;
  }

  async getPolicyByType(iprType: string): Promise<IncentivePolicy> {
    const response = await api.get<{ success: boolean; data: IncentivePolicy }>(
      `/incentive-policies/type/${iprType}`
    );
    return response.data.data;
  }

  async createPolicy(policy: Partial<IncentivePolicy>): Promise<IncentivePolicy> {
    const response = await api.post<{ success: boolean; data: IncentivePolicy }>(
      '/incentive-policies',
      policy
    );
    return response.data.data;
  }

  async updatePolicy(id: string, policy: Partial<IncentivePolicy>): Promise<IncentivePolicy> {
    const response = await api.put<{ success: boolean; data: IncentivePolicy }>(
      `/incentive-policies/${id}`,
      policy
    );
    return response.data.data;
  }

  async deletePolicy(id: string): Promise<void> {
    await api.delete(`/incentive-policies/${id}`);
  }

  async calculateIncentive(params: {
    iprType: string;
    filingType?: string;
    projectType?: string;
    inventorCount?: number;
  }): Promise<IncentiveCalculation> {
    const response = await api.post<{ success: boolean; data: IncentiveCalculation }>(
      '/incentive-policies/calculate',
      params
    );
    return response.data.data;
  }
}

export const incentivePolicyService = new IncentivePolicyService();
