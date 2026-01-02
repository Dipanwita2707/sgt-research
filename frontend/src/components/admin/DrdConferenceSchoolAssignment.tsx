'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Presentation,
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
  Calendar,
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
  assignedConferenceSchoolIds: string[];
  assignedConferenceSchools?: { id: string; facultyName: string; facultyCode: string }[];
}

// Helper to get permission keys that are true
const getActivePermissions = (permissions: Record<string, boolean> | string[] | undefined): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  return Object.entries(permissions)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);
};

// Filter to show only conference-related permissions
const getConferencePermissions = (permissions: Record<string, boolean> | string[] | undefined): string[] => {
  const activePerms = getActivePermissions(permissions);
  return activePerms.filter((p) => p.includes('conference'));
};

export default function DrdConferenceSchoolAssignment() {
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
        api.get('/permission-management/drd-members/with-conference-schools'),
        api.get('/permission-management/schools/with-conference-members'),
      ]);

      // Handle the nested response structure
      const membersData = membersRes.data?.data?.members || membersRes.data?.data || [];
      setDrdMembers(Array.isArray(membersData) ? membersData : []);
      
      // Extract schools from response
      const allSchools = membersRes.data?.data?.allSchools || [];
      setSchools(Array.isArray(allSchools) ? allSchools : []);
    } catch (err: any) {
      console.error('Failed to fetch conference school data:', err);
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
    setEditedSchoolIds([...(member.assignedConferenceSchoolIds || [])]);
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

      await api.post('/permission-management/conference-member/assign-schools', {
        userId: selectedMember.userId,
        schoolIds: editedSchoolIds,
      });

      setSuccess(`Successfully updated conference school assignments for ${selectedMember.user?.employeeDetails?.displayName || selectedMember.user?.uid}`);
      closeEditModal();
      fetchData();
    } catch (err: any) {
      console.error('Failed to save conference school assignment:', err);
      setError(err.response?.data?.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const selectAllSchools = () => {
    setEditedSchoolIds(schools.map((s) => s.id));
  };

  const clearAllSchools = () => {
    setEditedSchoolIds([]);
  };

  const getSchoolName = (schoolId: string): string => {
    const school = schools.find((s) => s.id === schoolId);
    return school?.facultyName || 'Unknown School';
  };

  const filteredMembers = Array.isArray(drdMembers) ? drdMembers.filter((member) => {
    const search = searchTerm.toLowerCase();
    const displayName = member.user?.employeeDetails?.displayName?.toLowerCase() || '';
    const uid = member.user?.uid?.toLowerCase() || '';
    const email = member.user?.email?.toLowerCase() || '';
    return displayName.includes(search) || uid.includes(search) || email.includes(search);
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Presentation className="text-purple-600" />
          Conference School Assignment
        </h1>
        <p className="text-gray-600 mt-2">
          Assign DRD Members to specific schools for <strong>Conference Paper</strong> review. 
          Members will only see conference contributions from their assigned schools in their review queue.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Refresh */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search DRD members by name, UID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* DRD Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No DRD members found. Make sure users have been assigned DRD department permissions.</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.userId}
              className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Member Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {member.user?.employeeDetails?.displayName || member.user?.uid || 'Unknown'}
                    </h3>
                    <p className="text-sm text-purple-100 truncate">
                      {member.user?.employeeDetails?.designation || member.user?.role || 'Staff'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Member Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  <span>{member.user?.uid || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{member.user?.employeeDetails?.primaryDepartment?.departmentName || 'N/A'}</span>
                </div>

                {/* Conference Permissions */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Conference Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {getConferencePermissions(member.permissions).length > 0 ? (
                      getConferencePermissions(member.permissions).map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {perm.replace(/_/g, ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No conference permissions</span>
                    )}
                  </div>
                </div>

                {/* Assigned Schools */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Assigned Schools ({member.assignedConferenceSchoolIds?.length || 0}):
                  </p>
                  {member.assignedConferenceSchoolIds?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {member.assignedConferenceSchoolIds.slice(0, 5).map((schoolId) => (
                        <span
                          key={schoolId}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          {getSchoolName(schoolId).substring(0, 20)}
                        </span>
                      ))}
                      {member.assignedConferenceSchoolIds.length > 5 && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          +{member.assignedConferenceSchoolIds.length - 5} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No schools assigned</p>
                  )}
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => openEditModal(member)}
                  className="w-full mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Manage School Assignments
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-semibold">Edit Conference School Assignments</h2>
                  <p className="text-sm text-purple-100">
                    {selectedMember.user?.employeeDetails?.displayName || selectedMember.user?.uid}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Quick Actions */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={selectAllSchools}
                  className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllSchools}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear All
                </button>
                <span className="ml-auto text-sm text-gray-500">
                  {editedSchoolIds.length} of {schools.length} selected
                </span>
              </div>

              {/* Schools Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {schools.map((school) => {
                  const isSelected = editedSchoolIds.includes(school.id);
                  return (
                    <label
                      key={school.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSchoolToggle(school.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{school.facultyName}</p>
                        <p className="text-xs text-gray-500">{school.facultyCode}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignment}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Assignments
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
