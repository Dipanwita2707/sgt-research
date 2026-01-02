'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
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
  BookMarked,
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
  assignedBookSchoolIds: string[];
  assignedBookSchools?: { id: string; facultyName: string; facultyCode: string }[];
}

// Helper to get permission keys that are true
const getActivePermissions = (permissions: Record<string, boolean> | string[] | undefined): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  return Object.entries(permissions)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);
};

// Filter to show only book-related permissions
const getBookPermissions = (permissions: Record<string, boolean> | string[] | undefined): string[] => {
  const activePerms = getActivePermissions(permissions);
  return activePerms.filter((p) => p.includes('book'));
};

export default function DrdBookSchoolAssignment() {
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
        api.get('/permission-management/drd-members/with-book-schools'),
        api.get('/permission-management/schools/with-book-members'),
      ]);

      // Handle the nested response structure
      const membersData = membersRes.data?.data?.members || membersRes.data?.data || [];
      setDrdMembers(Array.isArray(membersData) ? membersData : []);
      
      // Extract schools from response
      const allSchools = membersRes.data?.data?.allSchools || [];
      setSchools(Array.isArray(allSchools) ? allSchools : []);
    } catch (err: any) {
      console.error('Failed to fetch book school data:', err);
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
    setEditedSchoolIds([...(member.assignedBookSchoolIds || [])]);
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

      await api.post('/permission-management/book-member/assign-schools', {
        userId: selectedMember.userId,
        schoolIds: editedSchoolIds,
      });

      setSuccess(`Successfully updated book school assignments for ${selectedMember.user?.employeeDetails?.displayName || selectedMember.user?.uid}`);
      closeEditModal();
      fetchData();
    } catch (err: any) {
      console.error('Failed to save book school assignment:', err);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookMarked className="text-teal-600" />
          Book / Book Chapter School Assignment
        </h1>
        <p className="text-gray-600 mt-2">
          Assign DRD Members to specific schools for <strong>Book & Book Chapter</strong> review. 
          Members will only see book/chapter contributions from their assigned schools in their review queue.
        </p>
        <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800">
          <strong>Note:</strong> These assignments are separate from IPR and Research school assignments. 
          A member can review books for different schools than research contributions or IPR applications.
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-4 h-4 text-green-600" />
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-lg">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{drdMembers.length}</p>
              <p className="text-sm text-gray-500">DRD Members</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{schools.length}</p>
              <p className="text-sm text-gray-500">Schools</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {drdMembers.filter((m) => (m.assignedBookSchoolIds || []).length > 0).length}
              </p>
              <p className="text-sm text-gray-500">With Book Assignments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {drdMembers.filter((m) => (m.assignedBookSchoolIds || []).length === 0).length}
              </p>
              <p className="text-sm text-gray-500">Without Book Schools</p>
            </div>
          </div>
        </div>
      </div>

      {/* DRD Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              DRD Members - Book School Assignments
            </h2>
            <p className="text-gray-600 mt-1">
              Click on a member to assign book review schools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Member Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Book Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assigned Book Schools
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => {
                const bookSchoolIds = member.assignedBookSchoolIds || [];
                return (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${
                            bookSchoolIds.length > 0
                              ? 'bg-teal-400'
                              : 'bg-orange-400'
                          }`}
                        ></div>
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.user?.employeeDetails?.displayName || member.user?.uid || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">{member.uid || member.user?.uid} • {member.email || member.user?.email}</div>
                          <div className="text-xs text-gray-400">
                            {member.user?.employeeDetails?.designation || 'No designation'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getBookPermissions(member.permissions).length > 0 ? (
                          getBookPermissions(member.permissions).map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs"
                            >
                              {perm.replace('book_', '').replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No book permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {bookSchoolIds.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {bookSchoolIds.slice(0, 2).map((schoolId) => (
                              <span
                                key={schoolId}
                                className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs"
                              >
                                {getSchoolName(schoolId)}
                              </span>
                            ))}
                            {bookSchoolIds.length > 2 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{bookSchoolIds.length - 2} more
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {bookSchoolIds.length} school(s) assigned
                          </p>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                          No book schools assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal(member)}
                        className="px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 text-sm flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Assign Schools
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm
                      ? 'No members found matching your search'
                      : 'No DRD members found. Grant DRD permissions to users first.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schools Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            Book Schools Overview
          </h2>
          <p className="text-gray-600 mt-1">
            View which DRD members are assigned to review book/chapter contributions for each school
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => {
            const assignedMembers = drdMembers.filter((m) =>
              (m.assignedBookSchoolIds || []).includes(school.id)
            );
            return (
              <div
                key={school.id}
                className={`border rounded-lg p-4 ${
                  assignedMembers.length > 0
                    ? 'border-teal-200 bg-teal-50'
                    : 'border-orange-200 bg-orange-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap
                    className={`w-5 h-5 ${
                      assignedMembers.length > 0 ? 'text-teal-600' : 'text-orange-600'
                    }`}
                  />
                  <h3 className="font-medium text-gray-900">{school.facultyName}</h3>
                </div>
                <p className="text-xs text-gray-500 mb-2">{school.facultyCode}</p>
                {assignedMembers.length > 0 ? (
                  <div className="space-y-1">
                    {assignedMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <User className="w-3 h-3 text-gray-400" />
                        {member.user?.employeeDetails?.displayName || member.uid || member.user?.uid}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-orange-700">No members assigned</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BookMarked className="w-6 h-6 text-teal-600" />
                  Assign Book Schools
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  For: {selectedMember.user?.employeeDetails?.displayName || selectedMember.uid || selectedMember.user?.uid}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {editedSchoolIds.length} of {schools.length} schools selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllSchools}
                    className="text-xs px-3 py-1 bg-teal-100 text-teal-600 rounded-full hover:bg-teal-200"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllSchools}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {schools.map((school) => (
                    <label
                      key={school.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                        editedSchoolIds.includes(school.id)
                          ? 'bg-teal-100 border-teal-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editedSchoolIds.includes(school.id)}
                        onChange={() => handleSchoolToggle(school.id)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {school.facultyName}
                        </p>
                        <p className="text-xs text-gray-500">{school.facultyCode}</p>
                      </div>
                      {editedSchoolIds.includes(school.id) && (
                        <CheckCircle2 className="w-5 h-5 text-teal-600" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAssignment}
                  disabled={saving}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
