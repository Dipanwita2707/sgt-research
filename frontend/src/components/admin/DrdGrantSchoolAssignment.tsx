'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  Building2,
  User,
  Users,
  MapPin,
  CheckCircle2,
  X,
  Save,
  RefreshCw,
  GraduationCap,
  Search,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';

// School interface
interface School {
  id: string;
  facultyCode: string;
  facultyName: string;
  shortName?: string;
}

interface DrdMemberUser {
  id: string;
  uid: string;
  email: string;
  role?: string;
  employeeDetails?: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    designation?: string;
    primaryDepartment?: {
      departmentName?: string;
    };
  } | null;
}

interface DrdMember {
  id?: string;
  userId: string;
  uid?: string;
  email?: string;
  user?: DrdMemberUser;
  permissions: Record<string, boolean>;
  assignedGrantSchoolIds: string[];
  assignedGrantSchools?: { id: string; facultyName: string; facultyCode: string }[];
}

// Helper to get permission keys that are true
const getActivePermissions = (permissions: Record<string, boolean> | string[] | undefined): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  return Object.entries(permissions)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);
};

// Filter to show only grant-related permissions
const getGrantPermissions = (permissions: Record<string, boolean> | string[] | undefined): string[] => {
  const activePerms = getActivePermissions(permissions);
  return activePerms.filter((p) => p.includes('grant'));
};

export default function DrdGrantSchoolAssignment() {
  const [schools, setSchools] = useState<School[]>([]);
  const [drdMembers, setDrdMembers] = useState<DrdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected member for editing
  const [selectedMember, setSelectedMember] = useState<DrdMember | null>(null);
  const [editedSchoolIds, setEditedSchoolIds] = useState<string[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [membersRes, schoolsRes] = await Promise.all([
        api.get('/permission-management/drd-members/with-grant-schools'),
        api.get('/permission-management/schools/with-grant-members'),
      ]);

      // Handle the nested response structure
      const membersData = membersRes.data?.data?.members || membersRes.data?.data || [];
      setDrdMembers(Array.isArray(membersData) ? membersData : []);
      
      // Extract schools from response
      const allSchools = membersRes.data?.data?.allSchools || [];
      setSchools(Array.isArray(allSchools) ? allSchools : []);
    } catch (err: any) {
      console.error('Failed to fetch grant school data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditModal = (member: DrdMember) => {
    setSelectedMember(member);
    setEditedSchoolIds([...(member.assignedGrantSchoolIds || [])]);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setSelectedMember(null);
    setEditedSchoolIds([]);
    setShowEditModal(false);
  };

  const handleSchoolToggle = (schoolId: string) => {
    setEditedSchoolIds((prev) => {
      if (prev.includes(schoolId)) {
        return prev.filter((id) => id !== schoolId);
      } else {
        return [...prev, schoolId];
      }
    });
  };

  const handleSaveAssignment = async () => {
    if (!selectedMember) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.post('/permission-management/grant-member/assign-schools', {
        userId: selectedMember.userId,
        schoolIds: editedSchoolIds,
      });

      setSuccess(`Successfully updated grant school assignments for ${selectedMember.user?.employeeDetails?.displayName || selectedMember.user?.uid}`);
      closeEditModal();
      fetchData();
    } catch (err: any) {
      console.error('Failed to save grant school assignment:', err);
      setError(err.response?.data?.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = drdMembers.filter((member) => {
    const displayName = member.user?.employeeDetails?.displayName || '';
    const firstName = member.user?.employeeDetails?.firstName || '';
    const lastName = member.user?.employeeDetails?.lastName || '';
    const email = member.user?.email || '';
    const uid = member.user?.uid || '';

    const searchStr = `${displayName} ${firstName} ${lastName} ${email} ${uid}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-10 h-10 text-white" />
          <div>
            <h1 className="text-2xl font-bold text-white">Grant School Assignment</h1>
            <p className="text-orange-100 text-sm">Assign grant review schools to DRD members</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Note:</strong> These assignments are separate from IPR, Research, Book, and Conference school assignments. 
          DRD members with grant_review or grant_approve permissions should be assigned schools here to review grant/funding applications from those schools.
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-4 h-4 text-green-600" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search DRD members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No DRD members found with grant permissions</p>
            <p className="text-gray-400 text-sm">Grant-related permissions: grant_review, grant_approve, grant_assign_school</p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const grantPerms = getGrantPermissions(member.permissions);
            const hasReviewOrApprove = grantPerms.some(p => p.includes('review') || p.includes('approve'));

            return (
              <div
                key={member.userId || member.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">
                        {member.user?.employeeDetails?.displayName ||
                          `${member.user?.employeeDetails?.firstName || ''} ${member.user?.employeeDetails?.lastName || ''}`.trim() ||
                          member.user?.uid ||
                          'Unknown'}
                      </h3>
                      <p className="text-sm text-gray-600">{member.user?.email || 'No email'}</p>
                      {member.user?.employeeDetails?.designation && (
                        <p className="text-sm text-gray-500">{member.user.employeeDetails.designation}</p>
                      )}

                      {/* Grant Permissions */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {grantPerms.length > 0 ? (
                          grantPerms.map((perm) => (
                            <span
                              key={perm}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                            >
                              {perm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No grant permissions</span>
                        )}
                      </div>

                      {/* Assigned Schools */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-gray-700">
                            Assigned Grant Schools ({member.assignedGrantSchoolIds?.length || 0})
                          </span>
                        </div>
                        {member.assignedGrantSchools && member.assignedGrantSchools.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {member.assignedGrantSchools.map((school) => (
                              <span
                                key={school.id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                              >
                                <GraduationCap className="w-3 h-3" />
                                {school.facultyName || school.facultyCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No schools assigned</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit Button */}
                  {hasReviewOrApprove && (
                    <button
                      onClick={() => openEditModal(member)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 font-medium"
                    >
                      <MapPin className="w-4 h-4" />
                      Assign Schools
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-white" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Assign Grant Schools</h2>
                    <p className="text-orange-100 text-sm">
                      {selectedMember.user?.employeeDetails?.displayName || selectedMember.user?.uid}
                    </p>
                  </div>
                </div>
                <button onClick={closeEditModal} className="text-white hover:bg-orange-600 p-2 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select the schools this DRD member can review grant/funding applications from:
              </p>
              <div className="space-y-2">
                {schools.map((school) => {
                  const isAssigned = editedSchoolIds.includes(school.id);
                  return (
                    <label
                      key={school.id}
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                        isAssigned
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-white border-gray-200 hover:border-orange-200 hover:bg-orange-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleSchoolToggle(school.id)}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <Building2 className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-gray-900">{school.facultyName}</p>
                          <p className="text-sm text-gray-500">{school.facultyCode}</p>
                        </div>
                      </div>
                      {isAssigned && <CheckCircle2 className="w-5 h-5 text-orange-600" />}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-6 bg-gray-50 flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignment}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Assignment
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
