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
  Percent,
  Calendar,
  Info,
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
  { value: 'percentage_based', label: 'Percentage Based', description: 'Distribute based on author role percentages' },
];

// Only First Author and Corresponding Author percentages are defined
// Co-Author percentage is automatically calculated as remainder (100% - first - corresponding)
// If same person is both First & Corresponding, they get both percentages combined
const AUTHOR_ROLES = [
  { value: 'first_author', label: 'First Author', defaultPercentage: 35 },
  { value: 'corresponding_author', label: 'Corresponding Author', defaultPercentage: 30 },
  // co_author percentage = 100 - first_author - corresponding_author (auto-calculated, split equally among co-authors)
];

// Quartile-based incentive structure (mandatory)
interface QuartileIncentive {
  quartile: 'Top 1%' | 'Top 5%' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
  incentiveAmount: number;
  points: number;
}

// SJR range-based incentive structure (optional)
interface SJRRange {
  id: string;
  minSJR: number;
  maxSJR: number;
  incentiveAmount: number;
  points: number;
}

interface RolePercentage {
  role: string;
  percentage: number;
}

const DEFAULT_QUARTILE_INCENTIVES: QuartileIncentive[] = [
  { quartile: 'Top 1%', incentiveAmount: 75000, points: 75 },
  { quartile: 'Top 5%', incentiveAmount: 60000, points: 60 },
  { quartile: 'Q1', incentiveAmount: 50000, points: 50 },
  { quartile: 'Q2', incentiveAmount: 30000, points: 30 },
  { quartile: 'Q3', incentiveAmount: 15000, points: 15 },
  { quartile: 'Q4', incentiveAmount: 5000, points: 5 },
];

// Default role percentages - only First Author and Corresponding Author
// Co-Author gets the remainder (100 - 35 - 30 = 35%), split equally among all co-authors
const DEFAULT_ROLE_PERCENTAGES: RolePercentage[] = [
  { role: 'first_author', percentage: 35 },
  { role: 'corresponding_author', percentage: 30 },
];

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
    splitPolicy: 'percentage_based';
    quartileIncentives: QuartileIncentive[];
    sjrRanges: SJRRange[];
    rolePercentages: RolePercentage[];
    effectiveFrom: string;
    effectiveTo: string;
  }>({
    publicationType: 'research_paper',
    policyName: '',
    splitPolicy: 'percentage_based',
    quartileIncentives: [...DEFAULT_QUARTILE_INCENTIVES],
    sjrRanges: [],
    rolePercentages: [...DEFAULT_ROLE_PERCENTAGES],
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
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
      // Extract data from stored policy
      const quartileData = (policy.indexingBonuses as any)?.quartileIncentives || DEFAULT_QUARTILE_INCENTIVES;
      const sjrData = (policy.indexingBonuses as any)?.sjrRanges || [];
      const rolePercentagesData = (policy.indexingBonuses as any)?.rolePercentages || DEFAULT_ROLE_PERCENTAGES;
      setEditingPolicy(policy);
      setFormData({
        publicationType: policy.publicationType,
        policyName: policy.policyName,
        splitPolicy: 'percentage_based',
        quartileIncentives: quartileData,
        sjrRanges: sjrData,
        rolePercentages: rolePercentagesData,
        effectiveFrom: policy.effectiveFrom ? new Date(policy.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        effectiveTo: policy.effectiveTo ? new Date(policy.effectiveTo).toISOString().split('T')[0] : '',
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        publicationType: 'research_paper',
        policyName: '',
        splitPolicy: 'percentage_based',
        quartileIncentives: [...DEFAULT_QUARTILE_INCENTIVES],
        sjrRanges: [],
        rolePercentages: [...DEFAULT_ROLE_PERCENTAGES],
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
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

      if (!formData.effectiveFrom) {
        setError('Please provide an effective from date');
        return;
      }

      // Validate role percentages: First Author + Corresponding Author must be <= 100
      const firstAuthorPct = formData.rolePercentages.find(rp => rp.role === 'first_author')?.percentage || 0;
      const correspondingAuthorPct = formData.rolePercentages.find(rp => rp.role === 'corresponding_author')?.percentage || 0;
      const totalDefinedPct = firstAuthorPct + correspondingAuthorPct;
      
      if (totalDefinedPct > 100) {
        setError(`First Author (${firstAuthorPct}%) + Corresponding Author (${correspondingAuthorPct}%) cannot exceed 100%`);
        return;
      }

      if (firstAuthorPct <= 0 || correspondingAuthorPct <= 0) {
        setError('First Author and Corresponding Author percentages must be greater than 0');
        return;
      }

      // Validate SJR ranges don't overlap (if any are defined)
      if (formData.sjrRanges.length > 0) {
        const sortedRanges = [...formData.sjrRanges].sort((a, b) => a.minSJR - b.minSJR);
        for (let i = 0; i < sortedRanges.length - 1; i++) {
          if (sortedRanges[i].maxSJR >= sortedRanges[i + 1].minSJR) {
            setError('SJR ranges cannot overlap');
            return;
          }
        }
      }

      // Store quartile incentives, SJR ranges, and role percentages in indexingBonuses field
      const indexingBonusesData = {
        quartileIncentives: formData.quartileIncentives,
        sjrRanges: formData.sjrRanges,
        rolePercentages: formData.rolePercentages,
      };

      // Calculate base amount and points from Q1 for backward compatibility
      const q1Incentive = formData.quartileIncentives.find(q => q.quartile === 'Q1') || formData.quartileIncentives[0];

      const policyData = {
        publicationType: formData.publicationType,
        policyName: formData.policyName,
        baseIncentiveAmount: q1Incentive.incentiveAmount,
        basePoints: q1Incentive.points,
        splitPolicy: formData.splitPolicy,
        indexingBonuses: indexingBonusesData,
        effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        effectiveTo: formData.effectiveTo ? new Date(formData.effectiveTo).toISOString() : null,
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
            Configure incentive amounts and points based on journal quartile (Top 1%, Top 5%, Q1-Q4) and optional SJR ranges
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

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Incentive Distribution Rules:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Quartile incentives (Top 1%, Top 5%, Q1-Q4) are <strong>mandatory</strong> for all policies</li>
            <li>SJR range incentives are <strong>optional</strong> and override quartile amounts when defined</li>
            <li><strong>First Author</strong> and <strong>Corresponding Author</strong> percentages are defined in policy</li>
            <li><strong>Co-Authors</strong> automatically share the remainder (100% - First - Corresponding), split equally among <strong>internal</strong> co-authors</li>
            <li>If same person is <strong>First + Corresponding</strong>, they get both percentages combined</li>
            <li>If <strong>single author</strong>, they get 100% of the incentive</li>
            <li>If <strong>exactly 2 authors with NO co-authors</strong> (one first, one corresponding), they <strong>split 50-50</strong></li>
          </ul>
          <p className="font-semibold mt-2 mb-1">External Author Rules:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>External authors</strong> receive <strong>₹0 incentives and 0 points</strong></li>
            <li>If <strong>External First/Corresponding Author</strong>: their share is <strong>forfeited</strong> (not redistributed)</li>
            <li>If <strong>External Co-Author</strong>: their share is <strong>redistributed to internal co-authors</strong></li>
          </ul>
          <p className="font-semibold mt-2 mb-1">Point Distribution:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Points are distributed only among <strong>employees</strong> (internal faculty/staff)</li>
            <li><strong>Students</strong> get incentives but <strong>0 points</strong></li>
          </ul>
        </div>
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
          const typePolicies = policies.filter(p => p.publicationType === pubType.value);
          const activePolicy = typePolicies.find(p => p.isActive);

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
                        {activePolicy ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Currently Active: {activePolicy.policyName}
                          </span>
                        ) : 'No active policy for current date'}
                      </p>
                    </div>
                  </div>
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
                </div>
              </div>

              {/* Active Policy */}
              {activePolicy && (
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Validity Period */}
                      <div className="mb-4 flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Valid: {formatDate(activePolicy.effectiveFrom)} → {formatDate(activePolicy.effectiveTo)}
                        </span>
                      </div>

                      {/* Quartile Incentives */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Quartile-Based Incentives</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {((activePolicy.indexingBonuses as any)?.quartileIncentives || DEFAULT_QUARTILE_INCENTIVES).map((q: QuartileIncentive) => (
                            <div key={q.quartile} className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
                              <div className="flex-1">
                                <span className="text-sm font-bold text-gray-700">{q.quartile}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-base font-bold text-green-600">
                                    ₹{Number(q.incentiveAmount).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-blue-600 font-semibold">
                                    {q.points} pts
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SJR Ranges (if any) */}
                      {((activePolicy.indexingBonuses as any)?.sjrRanges || []).length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">SJR-Based Incentives (Optional)</h4>
                          <div className="space-y-2">
                            {((activePolicy.indexingBonuses as any)?.sjrRanges || []).map((range: SJRRange, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    SJR {range.minSJR.toFixed(2)} - {range.maxSJR.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-green-600">
                                      ₹{Number(range.incentiveAmount).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-blue-600 font-semibold">
                                      {range.points} pts
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Role Percentages */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Author Role Percentages</h4>
                        <div className="space-y-2">
                          {((activePolicy.indexingBonuses as any)?.rolePercentages || DEFAULT_ROLE_PERCENTAGES).map((rp: RolePercentage) => {
                            const roleInfo = AUTHOR_ROLES.find(r => r.value === rp.role);
                            return (
                              <div key={rp.role} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                                <span className="text-sm text-gray-700">{roleInfo?.label || rp.role}</span>
                                <span className="text-sm font-semibold text-blue-600">{rp.percentage}%</span>
                              </div>
                            );
                          })}
                          {/* Show calculated Co-Author percentage */}
                          {(() => {
                            const rolePercentages = (activePolicy.indexingBonuses as any)?.rolePercentages || DEFAULT_ROLE_PERCENTAGES;
                            const firstPct = rolePercentages.find((r: RolePercentage) => r.role === 'first_author')?.percentage || 0;
                            const corrPct = rolePercentages.find((r: RolePercentage) => r.role === 'corresponding_author')?.percentage || 0;
                            const coAuthorPct = 100 - firstPct - corrPct;
                            return (
                              <div className="flex items-center justify-between bg-amber-50 rounded px-3 py-2 border border-amber-200">
                                <span className="text-sm text-gray-700">Co-Authors (shared equally)</span>
                                <span className="text-sm font-semibold text-amber-600">{coAuthorPct}%</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Split Policy */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>Split Policy: <strong className="text-gray-800">{activePolicy.splitPolicy?.replace(/_/g, ' ') || 'Percentage Based'}</strong></span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleOpenModal(activePolicy)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Policy"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(activePolicy)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Policy"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No Active Policy Notice */}
              {!activePolicy && (
                <div className="p-6 bg-gray-50">
                  <p className="text-sm text-gray-500 text-center">
                    No active policy. Create one to set incentives for this publication type.
                  </p>
                </div>
              )}

              {/* Inactive Policies */}
              {typePolicies.filter(p => !p.isActive).length > 0 && (
                <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
                  <p className="text-xs text-gray-500">
                    {typePolicies.filter(p => !p.isActive).length} inactive policy(ies)
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      // Redirect to book policies page if book is selected
                      if (selectedType === 'book') {
                        window.location.href = '/admin/book-policies';
                        return;
                      }
                      // Redirect to book chapter policies page if book_chapter is selected
                      if (selectedType === 'book_chapter') {
                        window.location.href = '/admin/book-chapter-policies';
                        return;
                      }
                      setFormData({ ...formData, publicationType: selectedType });
                    }}
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
                    placeholder="e.g., Research Paper Policy 2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Validity Period */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Policy Validity Period
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Incentives will be calculated based on this policy if the publication date falls within this period.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective From <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective To <span className="text-gray-400">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveTo}
                      onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                      min={formData.effectiveFrom}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for no end date</p>
                  </div>
                </div>
              </div>

              {/* Quartile-Based Incentives (Mandatory) */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Quartile-Based Incentives <span className="text-red-500 text-sm">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Define base incentive amounts for each journal quartile (Top 1%, Top 5%, Q1, Q2, Q3, Q4). These are mandatory and applied based on publication date.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.quartileIncentives.map((q) => (
                    <div key={q.quartile} className="p-4 rounded-xl border-2 border-green-200 bg-green-50/30">
                      <h4 className="font-bold text-gray-900 mb-3 text-lg">{q.quartile}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Coins className="w-4 h-4 inline mr-1 text-green-600" />
                            Incentive (₹)
                          </label>
                          <input
                            type="number"
                            value={q.incentiveAmount}
                            onChange={(e) => setFormData({
                              ...formData,
                              quartileIncentives: formData.quartileIncentives.map(qi => 
                                qi.quartile === q.quartile ? { ...qi, incentiveAmount: Number(e.target.value) } : qi
                              )
                            })}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Award className="w-4 h-4 inline mr-1 text-blue-600" />
                            Points
                          </label>
                          <input
                            type="number"
                            value={q.points}
                            onChange={(e) => setFormData({
                              ...formData,
                              quartileIncentives: formData.quartileIncentives.map(qi => 
                                qi.quartile === q.quartile ? { ...qi, points: Number(e.target.value) } : qi
                              )
                            })}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SJR-Based Incentives (Optional) */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  SJR-Based Incentive Ranges <span className="text-gray-400 text-sm">(Optional)</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <strong>Optional:</strong> Define additional incentive amounts based on specific SJR value ranges. If not defined, quartile-based incentives will be used.
                </p>
                
                <div className="space-y-3">
                  {formData.sjrRanges.map((range, index) => (
                    <div key={range.id} className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Range #{index + 1}</h4>
                        {formData.sjrRanges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              sjrRanges: formData.sjrRanges.filter(r => r.id !== range.id)
                            })}
                            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min SJR
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={range.minSJR}
                            onChange={(e) => setFormData({
                              ...formData,
                              sjrRanges: formData.sjrRanges.map(r => 
                                r.id === range.id ? { ...r, minSJR: Number(e.target.value) } : r
                              )
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max SJR
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={range.maxSJR}
                            onChange={(e) => setFormData({
                              ...formData,
                              sjrRanges: formData.sjrRanges.map(r => 
                                r.id === range.id ? { ...r, maxSJR: Number(e.target.value) } : r
                              )
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Coins className="w-4 h-4 inline mr-1 text-green-600" />
                            Incentive (₹)
                          </label>
                          <input
                            type="number"
                            value={range.incentiveAmount}
                            onChange={(e) => setFormData({
                              ...formData,
                              sjrRanges: formData.sjrRanges.map(r => 
                                r.id === range.id ? { ...r, incentiveAmount: Number(e.target.value) } : r
                              )
                            })}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Award className="w-4 h-4 inline mr-1 text-blue-600" />
                            Points
                          </label>
                          <input
                            type="number"
                            value={range.points}
                            onChange={(e) => setFormData({
                              ...formData,
                              sjrRanges: formData.sjrRanges.map(r => 
                                r.id === range.id ? { ...r, points: Number(e.target.value) } : r
                              )
                            })}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    sjrRanges: [
                      ...formData.sjrRanges,
                      {
                        id: Date.now().toString(),
                        minSJR: 0,
                        maxSJR: 0,
                        incentiveAmount: 5000,
                        points: 5,
                      }
                    ]
                  })}
                  className="mt-3 w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add SJR Range
                </button>
              </div>

              {/* Author Role Percentages */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-blue-600" />
                  Author Role Percentages
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Define percentages for First Author and Corresponding Author. Co-Authors automatically share the remainder.
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 font-medium mb-2">Distribution Examples:</p>
                  <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                    <li>Single author → gets 100% (regardless of role)</li>
                    <li>Same person is First + Corresponding → gets both percentages combined</li>
                    <li>First (35%) + Corresponding (30%) + 2 Co-Authors → Co-authors each get 17.5%</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  {formData.rolePercentages.map(rp => {
                    const roleInfo = AUTHOR_ROLES.find(r => r.value === rp.role);
                    return (
                      <div key={rp.role} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <label className="font-medium text-gray-700">{roleInfo?.label}</label>
                        </div>
                        <div className="w-32">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={rp.percentage}
                              onChange={(e) => setFormData({
                                ...formData,
                                rolePercentages: formData.rolePercentages.map(r => 
                                  r.role === rp.role ? { ...r, percentage: Number(e.target.value) } : r
                                )
                              })}
                              min="1"
                              max="99"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-600 font-semibold">%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show calculated Co-Author percentage */}
                  {(() => {
                    const firstPct = formData.rolePercentages.find(rp => rp.role === 'first_author')?.percentage || 0;
                    const corrPct = formData.rolePercentages.find(rp => rp.role === 'corresponding_author')?.percentage || 0;
                    const coAuthorPct = 100 - firstPct - corrPct;
                    return (
                      <div className="flex items-center gap-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex-1">
                          <label className="font-medium text-amber-800">Co-Authors (auto-calculated)</label>
                          <p className="text-xs text-amber-600">Split equally among all co-authors</p>
                        </div>
                        <div className="w-32">
                          <div className="flex items-center gap-2">
                            <div className="w-full px-3 py-2 bg-amber-100 rounded-lg text-amber-800 font-bold text-center">
                              {coAuthorPct}
                            </div>
                            <span className="text-amber-600 font-semibold">%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {(() => {
                    const firstPct = formData.rolePercentages.find(rp => rp.role === 'first_author')?.percentage || 0;
                    const corrPct = formData.rolePercentages.find(rp => rp.role === 'corresponding_author')?.percentage || 0;
                    const totalDefined = firstPct + corrPct;
                    return (
                      <p className="text-sm text-blue-800">
                        <strong>First + Corresponding:</strong> {totalDefined}% 
                        {totalDefined > 100 && (
                          <span className="text-red-600 ml-2">⚠️ Cannot exceed 100%</span>
                        )}
                        {totalDefined <= 100 && (
                          <span className="text-green-600 ml-2">✓ Remaining {100 - totalDefined}% for Co-Authors</span>
                        )}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Split Policy */}
              <div className="border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Split Policy
                  </label>
                  <select
                    value={formData.splitPolicy}
                    onChange={(e) => setFormData({ ...formData, splitPolicy: e.target.value as 'percentage_based' })}
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
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Policy will be automatically active based on its effective date range. Policies with overlapping dates for the same publication type are not allowed.
                  </p>
                </div>
              </div>
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
