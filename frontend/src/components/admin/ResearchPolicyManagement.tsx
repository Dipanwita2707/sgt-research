'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Award,
  Coins,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Mic,
  Gift,
} from 'lucide-react';
import { researchPolicyService, ResearchIncentivePolicy, IndexingBonuses, QuartileBonuses } from '@/services/researchPolicy.service';

const PUBLICATION_TYPES = [
  { value: 'research_paper', label: 'Research Paper', icon: '📄' },
  { value: 'book', label: 'Book', icon: '📚' },
  { value: 'book_chapter', label: 'Book Chapter', icon: '📖' },
  { value: 'conference_paper', label: 'Conference Paper', icon: '🎤' },
  { value: 'grant', label: 'Grant / Funding', icon: '💰' },
];

const SPLIT_POLICIES = [
  { value: 'equal', label: 'Equal Split', description: 'Divide equally among all authors' },
  { value: 'author_role_based', label: 'Author Role Based', description: 'Based on author role (first, corresponding, co-author)' },
  { value: 'weighted', label: 'Weighted by Contribution', description: 'Based on contribution percentage' },
];

const AUTHOR_ROLES = [
  { value: 'first_and_corresponding', label: 'First & Corresponding Author' },
  { value: 'first_author', label: 'First Author' },
  { value: 'corresponding_author', label: 'Corresponding Author' },
  { value: 'co_author', label: 'Co-Author' },
  { value: 'senior_author', label: 'Senior Author' },
];

const INDEXING_TYPES = ['scopus', 'wos', 'sci', 'ugc', 'pubmed', 'ieee'];
const QUARTILES = ['q1', 'q2', 'q3', 'q4'];

const DEFAULT_AUTHOR_MULTIPLIERS: Record<string, number> = {
  first_and_corresponding: 1.0,
  first_author: 0.7,
  corresponding_author: 0.7,
  co_author: 0.3,
  senior_author: 0.4,
};

const DEFAULT_INDEXING_BONUSES: IndexingBonuses = {
  scopus: 10000,
  wos: 15000,
  sci: 20000,
  ugc: 5000,
  pubmed: 12000,
  ieee: 12000,
};

const DEFAULT_QUARTILE_BONUSES: QuartileBonuses = {
  q1: 25000,
  q2: 15000,
  q3: 8000,
  q4: 3000,
};

export default function ResearchPolicyManagement() {
  const [policies, setPolicies] = useState<ResearchIncentivePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ResearchIncentivePolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState<{
    publicationType: string;
    policyName: string;
    baseIncentiveAmount: number;
    basePoints: number;
    splitPolicy: 'equal' | 'author_role_based' | 'weighted';
    primaryAuthorShare: number;
    authorTypeMultipliers: Record<string, number>;
    indexingBonuses: IndexingBonuses;
    quartileBonuses: QuartileBonuses;
    impactFactorTiers: Array<{ minIF: number; maxIF: number | null; bonus: number }>;
    isActive: boolean;
  }>({
    publicationType: 'research_paper',
    policyName: '',
    baseIncentiveAmount: 30000,
    basePoints: 30,
    splitPolicy: 'author_role_based',
    primaryAuthorShare: 50,
    authorTypeMultipliers: { ...DEFAULT_AUTHOR_MULTIPLIERS },
    indexingBonuses: { ...DEFAULT_INDEXING_BONUSES },
    quartileBonuses: { ...DEFAULT_QUARTILE_BONUSES },
    impactFactorTiers: [
      { minIF: 0, maxIF: 1, bonus: 0 },
      { minIF: 1, maxIF: 3, bonus: 5000 },
      { minIF: 3, maxIF: 5, bonus: 10000 },
      { minIF: 5, maxIF: 10, bonus: 20000 },
      { minIF: 10, maxIF: null, bonus: 40000 },
    ],
    isActive: true,
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await researchPolicyService.getAllPolicies(true);
      setPolicies(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (policy?: ResearchIncentivePolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        publicationType: policy.publicationType,
        policyName: policy.policyName,
        baseIncentiveAmount: Number(policy.baseIncentiveAmount),
        basePoints: policy.basePoints,
        splitPolicy: policy.splitPolicy,
        primaryAuthorShare: policy.primaryAuthorShare ? Number(policy.primaryAuthorShare) : 50,
        authorTypeMultipliers: policy.authorTypeMultipliers || { ...DEFAULT_AUTHOR_MULTIPLIERS },
        indexingBonuses: policy.indexingBonuses || { ...DEFAULT_INDEXING_BONUSES },
        quartileBonuses: (policy.indexingBonuses as any)?.quartileBonuses || { ...DEFAULT_QUARTILE_BONUSES },
        impactFactorTiers: policy.impactFactorTiers || [
          { minIF: 0, maxIF: 1, bonus: 0 },
          { minIF: 1, maxIF: 3, bonus: 5000 },
          { minIF: 3, maxIF: 5, bonus: 10000 },
          { minIF: 5, maxIF: 10, bonus: 20000 },
          { minIF: 10, maxIF: null, bonus: 40000 },
        ],
        isActive: policy.isActive,
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        publicationType: 'research_paper',
        policyName: '',
        baseIncentiveAmount: 30000,
        basePoints: 30,
        splitPolicy: 'author_role_based',
        primaryAuthorShare: 50,
        authorTypeMultipliers: { ...DEFAULT_AUTHOR_MULTIPLIERS },
        indexingBonuses: { ...DEFAULT_INDEXING_BONUSES },
        quartileBonuses: { ...DEFAULT_QUARTILE_BONUSES },
        impactFactorTiers: [
          { minIF: 0, maxIF: 1, bonus: 0 },
          { minIF: 1, maxIF: 3, bonus: 5000 },
          { minIF: 3, maxIF: 5, bonus: 10000 },
          { minIF: 5, maxIF: 10, bonus: 20000 },
          { minIF: 10, maxIF: null, bonus: 40000 },
        ],
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.policyName.trim()) {
        setError('Please provide a policy name');
        return;
      }

      // Merge quartile bonuses into indexing bonuses
      const indexingBonusesWithQuartiles = {
        ...formData.indexingBonuses,
        quartileBonuses: formData.quartileBonuses,
      };

      const policyData = {
        publicationType: formData.publicationType,
        policyName: formData.policyName,
        baseIncentiveAmount: formData.baseIncentiveAmount,
        basePoints: formData.basePoints,
        splitPolicy: formData.splitPolicy,
        primaryAuthorShare: formData.splitPolicy === 'weighted' ? formData.primaryAuthorShare : undefined,
        authorTypeMultipliers: formData.authorTypeMultipliers,
        indexingBonuses: indexingBonusesWithQuartiles,
        impactFactorTiers: formData.impactFactorTiers,
        isActive: formData.isActive,
      };

      if (editingPolicy) {
        await researchPolicyService.updatePolicy(editingPolicy.id, policyData);
        setSuccess('Policy updated successfully');
      } else {
        await researchPolicyService.createPolicy(policyData);
        setSuccess('Policy created successfully');
      }

      setShowModal(false);
      fetchPolicies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy: ResearchIncentivePolicy) => {
    if (!confirm(`Are you sure you want to delete the policy "${policy.policyName}"?`)) {
      return;
    }

    try {
      await researchPolicyService.deletePolicy(policy.id);
      setSuccess('Policy deleted successfully');
      fetchPolicies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete policy');
    }
  };

  const getPublicationTypeInfo = (type: string) => {
    return PUBLICATION_TYPES.find(t => t.value === type) || { value: type, label: type, icon: '📄' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-blue-600" />
            Research Paper Incentive Policies
          </h1>
          <p className="text-gray-500 mt-1">
            Configure incentive amounts and distribution policies for research publications
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Policy
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Policies Grid */}
      <div className="grid gap-6">
        {PUBLICATION_TYPES.map(pubType => {
          const typePolicy = policies.find(p => p.publicationType === pubType.value && p.isActive);
          const inactivePolicies = policies.filter(p => p.publicationType === pubType.value && !p.isActive);

          return (
            <div key={pubType.value} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Type Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{pubType.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{pubType.label}</h3>
                      <p className="text-sm text-gray-500">
                        {typePolicy ? `Active: ${typePolicy.policyName}` : 'Using default policy'}
                      </p>
                    </div>
                  </div>
                  {!typePolicy && (
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, publicationType: pubType.value }));
                        handleOpenModal();
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Create Policy
                    </button>
                  )}
                </div>
              </div>

              {/* Active Policy */}
              {typePolicy && (
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-green-600 font-medium">Base Amount</p>
                          <p className="text-lg font-bold text-green-700">₹{Number(typePolicy.baseIncentiveAmount).toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-blue-600 font-medium">Base Points</p>
                          <p className="text-lg font-bold text-blue-700">{typePolicy.basePoints} pts</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-xs text-purple-600 font-medium">Split Policy</p>
                          <p className="text-lg font-bold text-purple-700 capitalize">{typePolicy.splitPolicy?.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-xs text-amber-600 font-medium">Status</p>
                          <p className="text-lg font-bold text-amber-700">Active ✓</p>
                        </div>
                      </div>

                      {/* Author Role Multipliers */}
                      {typePolicy.authorTypeMultipliers && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Author Role Multipliers:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(typePolicy.authorTypeMultipliers).map(([role, multiplier]) => (
                              <span key={role} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {role.replace(/_/g, ' ')}: {(Number(multiplier) * 100).toFixed(0)}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Indexing Bonuses */}
                      {typePolicy.indexingBonuses && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Indexing Bonuses:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(typePolicy.indexingBonuses)
                              .filter(([key]) => !['quartileBonuses'].includes(key))
                              .map(([index, bonus]) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 rounded text-xs">
                                  {index.toUpperCase()}: ₹{Number(bonus).toLocaleString()}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleOpenModal(typePolicy)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Policy"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(typePolicy)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Policy"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Default Policy Notice */}
              {!typePolicy && (
                <div className="p-6 bg-gray-50">
                  <p className="text-sm text-gray-500 text-center">
                    Using system defaults. Create a custom policy to override.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPolicy ? 'Edit' : 'Create'} Research Incentive Policy
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publication Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.publicationType}
                    onChange={(e) => setFormData({ ...formData, publicationType: e.target.value })}
                    disabled={!!editingPolicy}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {PUBLICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.policyName}
                    onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                    placeholder="e.g., Research Paper Policy 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Incentive Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.baseIncentiveAmount}
                    onChange={(e) => setFormData({ ...formData, baseIncentiveAmount: Number(e.target.value) })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Points <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.basePoints}
                    onChange={(e) => setFormData({ ...formData, basePoints: Number(e.target.value) })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Split Policy <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.splitPolicy}
                    onChange={(e) => setFormData({ ...formData, splitPolicy: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {SPLIT_POLICIES.map(policy => (
                      <option key={policy.value} value={policy.value}>
                        {policy.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {SPLIT_POLICIES.find(p => p.value === formData.splitPolicy)?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Active Status
                  </label>
                  <label className="inline-flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="ml-2">Active</span>
                  </label>
                </div>
              </div>

              {/* Author Role Multipliers */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Author Role Multipliers
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Define percentage of base incentive each author role receives
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {AUTHOR_ROLES.map(role => (
                    <div key={role.value}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {role.label}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={(formData.authorTypeMultipliers[role.value] || 0) * 100}
                          onChange={(e) => setFormData({
                            ...formData,
                            authorTypeMultipliers: {
                              ...formData.authorTypeMultipliers,
                              [role.value]: Number(e.target.value) / 100
                            }
                          })}
                          min="0"
                          max="100"
                          step="5"
                          className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indexing Bonuses */}
              {(formData.publicationType === 'research_paper' || formData.publicationType === 'conference_paper') && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Indexing Bonuses (₹)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {INDEXING_TYPES.map(index => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">
                          {index}
                        </label>
                        <input
                          type="number"
                          value={(formData.indexingBonuses[index] as number) || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            indexingBonuses: {
                              ...formData.indexingBonuses,
                              [index]: Number(e.target.value)
                            }
                          })}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quartile Bonuses */}
              {formData.publicationType === 'research_paper' && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-blue-600" />
                    Quartile Bonuses (₹)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {QUARTILES.map(quartile => (
                      <div key={quartile}>
                        <label className="block text-sm font-medium text-gray-700 mb-1 uppercase">
                          {quartile}
                        </label>
                        <input
                          type="number"
                          value={formData.quartileBonuses[quartile] || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            quartileBonuses: {
                              ...formData.quartileBonuses,
                              [quartile]: Number(e.target.value)
                            }
                          })}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact Factor Tiers */}
              {formData.publicationType === 'research_paper' && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-blue-600" />
                    Impact Factor Bonus Tiers
                  </h3>
                  <div className="space-y-3">
                    {formData.impactFactorTiers.map((tier, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Min IF</label>
                            <input
                              type="number"
                              value={tier.minIF}
                              onChange={(e) => {
                                const newTiers = [...formData.impactFactorTiers];
                                newTiers[index] = { ...tier, minIF: Number(e.target.value) };
                                setFormData({ ...formData, impactFactorTiers: newTiers });
                              }}
                              step="0.1"
                              min="0"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Max IF</label>
                            <input
                              type="number"
                              value={tier.maxIF ?? ''}
                              onChange={(e) => {
                                const newTiers = [...formData.impactFactorTiers];
                                newTiers[index] = { ...tier, maxIF: e.target.value === '' ? null : Number(e.target.value) };
                                setFormData({ ...formData, impactFactorTiers: newTiers });
                              }}
                              step="0.1"
                              min="0"
                              placeholder="∞"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Bonus (₹)</label>
                            <input
                              type="number"
                              value={tier.bonus}
                              onChange={(e) => {
                                const newTiers = [...formData.impactFactorTiers];
                                newTiers[index] = { ...tier, bonus: Number(e.target.value) };
                                setFormData({ ...formData, impactFactorTiers: newTiers });
                              }}
                              min="0"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newTiers = formData.impactFactorTiers.filter((_, i) => i !== index);
                            setFormData({ ...formData, impactFactorTiers: newTiers });
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        impactFactorTiers: [
                          ...formData.impactFactorTiers,
                          { minIF: 0, maxIF: null, bonus: 0 }
                        ]
                      })}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Tier
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Policy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
