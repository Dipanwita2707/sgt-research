'use client';

import { useEffect, useState } from 'react';
import {
  permissionManagementService,
  UserWithPermissions,
  PermissionDefinitions,
  Permission,
} from '@/services/permissionManagement.service';
import { schoolService, School } from '@/services/school.service';
import {
  centralDepartmentService,
  CentralDepartment,
} from '@/services/centralDepartment.service';
import { Shield, Building2, Briefcase, ChevronDown, ChevronUp, User, Users, Settings, CheckCircle2 } from 'lucide-react';

export default function PermissionManagement() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [centralDepts, setCentralDepts] = useState<CentralDepartment[]>([]);
  const [permissionDefs, setPermissionDefs] = useState<PermissionDefinitions | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New department-focused approach
  const [selectedDepartmentType, setSelectedDepartmentType] = useState<'central' | 'school'>('central');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Form state
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});
  const [isPrimary, setIsPrimary] = useState(false);

  // Department permission definitions
  const departmentPermissions: Record<string, Record<string, Permission[]>> = {
    central: {
      DRD: [
        // IPR Permissions - 4 checkboxes
        { key: 'ipr_file_new', label: 'IPR Filing', category: 'IPR Permissions', description: 'Can file new IPR applications (Faculty/Student have this by default)' },
        { key: 'ipr_review', label: 'IPR Review', category: 'IPR Permissions', description: 'DRD Member - Can review IPR applications from assigned schools' },
        { key: 'ipr_approve', label: 'IPR Approve', category: 'IPR Permissions', description: 'DRD Head - Can give final approval/rejection on IPR applications' },
        { key: 'ipr_assign_school', label: 'Assign Schools to DRD Members (IPR)', category: 'IPR Permissions', description: 'DRD Head - Can assign schools to DRD member reviewers for IPR' },
        
        // Research Paper Permissions - 4 checkboxes
        { key: 'research_file_new', label: 'Research Paper Filing', category: 'Research Permissions', description: 'Can file new research paper contributions (Faculty/Student have this by default)' },
        { key: 'research_review', label: 'Research Paper Review', category: 'Research Permissions', description: 'DRD Member - Can review research paper contributions from assigned schools' },
        { key: 'research_approve', label: 'Research Paper Approve', category: 'Research Permissions', description: 'DRD Head - Can give final approval/rejection on research paper contributions' },
        { key: 'research_assign_school', label: 'Assign Schools to DRD Members (Research)', category: 'Research Permissions', description: 'DRD Head - Can assign schools to DRD member reviewers for Research' },
        
        // Book/Book Chapter Permissions - 4 checkboxes
        { key: 'book_file_new', label: 'Book/Chapter Filing', category: 'Book Permissions', description: 'Can file new book/book chapter contributions (Faculty/Student have this by default)' },
        { key: 'book_review', label: 'Book/Chapter Review', category: 'Book Permissions', description: 'DRD Member - Can review book/book chapter contributions from assigned schools' },
        { key: 'book_approve', label: 'Book/Chapter Approve', category: 'Book Permissions', description: 'DRD Head - Can give final approval/rejection on book/book chapter contributions' },
        { key: 'book_assign_school', label: 'Assign Schools to DRD Members (Book)', category: 'Book Permissions', description: 'DRD Head - Can assign schools to DRD member reviewers for Book/Chapter' },
        
        // Conference Paper Permissions - 4 checkboxes
        { key: 'conference_file_new', label: 'Conference Paper Filing', category: 'Conference Permissions', description: 'Can file new conference paper contributions (Faculty/Student have this by default)' },
        { key: 'conference_review', label: 'Conference Paper Review', category: 'Conference Permissions', description: 'DRD Member - Can review conference paper contributions from assigned schools' },
        { key: 'conference_approve', label: 'Conference Paper Approve', category: 'Conference Permissions', description: 'DRD Head - Can give final approval/rejection on conference paper contributions' },
        { key: 'conference_assign_school', label: 'Assign Schools to DRD Members (Conference)', category: 'Conference Permissions', description: 'DRD Head - Can assign schools to DRD member reviewers for Conference' },
        
        // Grant/Funding Permissions - 4 checkboxes
        { key: 'grant_file_new', label: 'Grant Filing', category: 'Grant Permissions', description: 'Can file new grant/funding applications (Faculty/Student have this by default)' },
        { key: 'grant_review', label: 'Grant Review', category: 'Grant Permissions', description: 'DRD Member - Can review grant/funding applications from assigned schools' },
        { key: 'grant_approve', label: 'Grant Approve', category: 'Grant Permissions', description: 'DRD Head - Can give final approval/rejection on grant/funding applications' },
        { key: 'grant_assign_school', label: 'Assign Schools to DRD Members (Grant)', category: 'Grant Permissions', description: 'DRD Head - Can assign schools to DRD member reviewers for Grant/Funding' },
      ],
      HR: [
        { key: 'hr_view_employees', label: 'View Employees', category: 'HR' },
        { key: 'hr_add_employees', label: 'Add Employees', category: 'HR' },
        { key: 'hr_edit_employees', label: 'Edit Employees', category: 'HR' },
        { key: 'hr_delete_employees', label: 'Delete Employees', category: 'HR' },
        { key: 'hr_manage_attendance', label: 'Manage Attendance', category: 'HR' },
        { key: 'hr_manage_leave', label: 'Manage Leave', category: 'HR' },
        { key: 'hr_manage_payroll', label: 'Manage Payroll', category: 'HR' },
        { key: 'hr_view_salary', label: 'View Salary', category: 'HR' },
        { key: 'hr_edit_salary', label: 'Edit Salary', category: 'HR' },
        { key: 'hr_approve_leave', label: 'Approve Leave', category: 'HR' },
        { key: 'hr_generate_reports', label: 'Generate HR Reports', category: 'HR' },
      ],
      FINANCE: [
        { key: 'finance_view_accounts', label: 'View Accounts', category: 'Finance' },
        { key: 'finance_manage_accounts', label: 'Manage Accounts', category: 'Finance' },
        { key: 'finance_view_transactions', label: 'View Transactions', category: 'Finance' },
        { key: 'finance_approve_transactions', label: 'Approve Transactions', category: 'Finance' },
        { key: 'finance_manage_fees', label: 'Manage Fees', category: 'Finance' },
        { key: 'finance_generate_invoices', label: 'Generate Invoices', category: 'Finance' },
        { key: 'finance_view_reports', label: 'View Financial Reports', category: 'Finance' },
        { key: 'finance_manage_budget', label: 'Manage Budget', category: 'Finance' },
      ],
      LIBRARY: [
        { key: 'library_view_books', label: 'View Books', category: 'Library' },
        { key: 'library_add_books', label: 'Add Books', category: 'Library' },
        { key: 'library_edit_books', label: 'Edit Books', category: 'Library' },
        { key: 'library_delete_books', label: 'Delete Books', category: 'Library' },
        { key: 'library_issue_books', label: 'Issue Books', category: 'Library' },
        { key: 'library_return_books', label: 'Return Books', category: 'Library' },
        { key: 'library_manage_members', label: 'Manage Members', category: 'Library' },
        { key: 'library_generate_reports', label: 'Generate Reports', category: 'Library' },
      ],
      IT: [
        { key: 'it_manage_infrastructure', label: 'Manage Infrastructure', category: 'IT' },
        { key: 'it_manage_networks', label: 'Manage Networks', category: 'IT' },
        { key: 'it_manage_security', label: 'Manage Security', category: 'IT' },
        { key: 'it_manage_users', label: 'Manage Users', category: 'IT' },
        { key: 'it_manage_permissions', label: 'Manage Permissions', category: 'IT' },
        { key: 'it_view_system_health', label: 'View System Health', category: 'IT' },
        { key: 'it_manage_backups', label: 'Manage Backups', category: 'IT' },
      ],
      ADMISSIONS: [
        { key: 'admissions_view_applications', label: 'View Applications', category: 'Admissions' },
        { key: 'admissions_review_applications', label: 'Review Applications', category: 'Admissions' },
        { key: 'admissions_approve_applications', label: 'Approve Applications', category: 'Admissions' },
        { key: 'admissions_reject_applications', label: 'Reject Applications', category: 'Admissions' },
        { key: 'admissions_manage_entrance_tests', label: 'Manage Entrance Tests', category: 'Admissions' },
        { key: 'admissions_generate_reports', label: 'Generate Reports', category: 'Admissions' },
      ],
      REGISTRAR: [
        { key: 'registrar_view_registrations', label: 'View Registrations', category: 'Registrar' },
        { key: 'registrar_approve_registrations', label: 'Approve Registrations', category: 'Registrar' },
        { key: 'registrar_issue_certificates', label: 'Issue Certificates', category: 'Registrar' },
        { key: 'registrar_manage_transcripts', label: 'Manage Transcripts', category: 'Registrar' },
        { key: 'registrar_verify_documents', label: 'Verify Documents', category: 'Registrar' },
        { key: 'registrar_manage_records', label: 'Manage Records', category: 'Registrar' },
      ],
      ERP: [
        { key: 'erp_view_modules', label: 'View ERP Modules', category: 'ERP' },
        { key: 'erp_configure', label: 'Configure ERP', category: 'ERP' },
        { key: 'erp_manage_workflows', label: 'Manage Workflows', category: 'ERP' },
        { key: 'erp_system_admin', label: 'System Administration', category: 'ERP' },
        { key: 'erp_view_logs', label: 'View System Logs', category: 'ERP' },
        { key: 'erp_manage_integrations', label: 'Manage Integrations', category: 'ERP' },
      ]
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, schoolsRes, centralDeptsRes, defsRes] = await Promise.all([
        permissionManagementService.getAllUsersWithPermissions(),
        schoolService.getAllSchools({ isActive: true }),
        centralDepartmentService.getAllCentralDepartments({ isActive: true }),
        permissionManagementService.getPermissionDefinitions(),
      ]);

      setUsers(usersRes.data);
      setSchools(schoolsRes.data);
      setCentralDepts(centralDeptsRes.data);
      setPermissionDefs(defsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPermissionModal = (user: UserWithPermissions) => {
    if (!selectedDepartmentId) {
      alert('Please select a department first');
      return;
    }
    
    setSelectedUser(user);
    
    // Load existing permissions for this user and department
    let existingPermissions: Record<string, boolean> = {};
    let isCurrentlyPrimary = false;
    
    if (selectedDepartmentType === 'central') {
      const existingPerm = user.centralDeptPermissions.find(perm => perm.centralDeptId === selectedDepartmentId);
      if (existingPerm) {
        existingPermissions = existingPerm.permissions;
        isCurrentlyPrimary = existingPerm.isPrimary;
      }
    } else {
      const existingPerm = user.schoolDeptPermissions.find(perm => perm.departmentId === selectedDepartmentId);
      if (existingPerm) {
        existingPermissions = existingPerm.permissions;
        isCurrentlyPrimary = existingPerm.isPrimary;
      }
    }
    
    setSelectedPermissions(existingPermissions);
    setIsPrimary(isCurrentlyPrimary);
    setShowPermissionModal(true);
  };

  const handlePermissionToggle = (permKey: string) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
  };

  const handleGrantPermissions = async () => {
    if (!selectedUser || !selectedDepartmentId) {
      alert('Please select a department and user');
      return;
    }

    if (Object.keys(selectedPermissions).filter(k => selectedPermissions[k]).length === 0) {
      alert('Please select at least one permission');
      return;
    }

    try {
      if (selectedDepartmentType === 'school') {
        await permissionManagementService.grantSchoolDeptPermissions({
          userId: selectedUser.id,
          departmentId: selectedDepartmentId,
          permissions: selectedPermissions,
          isPrimary,
        });
      } else {
        await permissionManagementService.grantCentralDeptPermissions({
          userId: selectedUser.id,
          centralDeptId: selectedDepartmentId,
          permissions: selectedPermissions,
          isPrimary,
        });
      }
      setShowPermissionModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to grant permissions');
    }
  };

  const handleRevoke = async (
    userId: string,
    departmentId: string,
    type: 'school' | 'central'
  ) => {
    if (!confirm('Are you sure you want to revoke these permissions?')) return;

    try {
      if (type === 'school') {
        await permissionManagementService.revokeSchoolDeptPermissions(userId, departmentId);
      } else {
        await permissionManagementService.revokeCentralDeptPermissions(userId, departmentId);
      }
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to revoke permissions');
    }
  };

  const getSelectedDepartment = () => {
    if (selectedDepartmentType === 'school') {
      return schools.flatMap(school => 
        school.departments?.map(dept => ({
          id: dept.id,
          name: dept.departmentName,
          code: dept.departmentCode,
          type: 'school'
        })) || []
      ).find(dept => dept.id === selectedDepartmentId);
    } else {
      return centralDepts.find(dept => dept.id === selectedDepartmentId);
    }
  };

  const getSelectedDepartmentName = () => {
    const dept = getSelectedDepartment();
    if (!dept) return '';
    
    if (selectedDepartmentType === 'central') {
      // For central departments, use departmentName property
      return (dept as CentralDepartment).departmentName;
    } else {
      // For school departments, use name property
      return (dept as { id: string; name: string; code: string; type: string; }).name;
    }
  };

  const getDepartmentPermissions = () => {
    if (!selectedDepartmentId) return [];
    
    const selectedDept = getSelectedDepartment();
    if (!selectedDept) return [];

    if (selectedDepartmentType === 'central') {
      const centralDept = selectedDept as CentralDepartment;
      // Try to match department code with permission definitions
      const deptCode = centralDept.departmentCode?.toUpperCase();
      
      // Check various possible matches for DRD department
      if (deptCode === 'DRD' || deptCode === 'DRD123' || centralDept.departmentName?.toUpperCase().includes('DRD')) {
        return departmentPermissions.central['DRD'] || [];
      }
      
      // For other departments, try direct match
      return departmentPermissions.central[deptCode] || [];
    }
    
    return []; // School department permissions would be added here
  };

  const groupPermissionsByCategory = (perms: Permission[]) => {
    return perms.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  const getFilteredUsers = () => {
    if (!selectedDepartmentId) return users;
    
    return users.filter(user => {
      if (selectedDepartmentType === 'central') {
        return user.centralDeptPermissions.some(perm => perm.centralDeptId === selectedDepartmentId);
      } else {
        return user.schoolDeptPermissions.some(perm => perm.departmentId === selectedDepartmentId);
      }
    });
  };

  // Quick permission preset functionality
  const applyPermissionPreset = (presetType: 'basic' | 'advanced' | 'full') => {
    const deptPermissions = getDepartmentPermissions();
    let permissions: Record<string, boolean> = {};
    
    switch (presetType) {
      case 'basic':
        // Grant basic read permissions
        deptPermissions.forEach(perm => {
          if (perm.label.toLowerCase().includes('view') || perm.label.toLowerCase().includes('dashboard')) {
            permissions[perm.key] = true;
          }
        });
        break;
      case 'advanced':
        // Grant read + some edit permissions
        deptPermissions.forEach(perm => {
          if (perm.label.toLowerCase().includes('view') || 
              perm.label.toLowerCase().includes('dashboard') ||
              perm.label.toLowerCase().includes('edit') ||
              perm.label.toLowerCase().includes('add') ||
              perm.label.toLowerCase().includes('manage')) {
            permissions[perm.key] = true;
          }
        });
        break;
      case 'full':
        // Grant all permissions
        deptPermissions.forEach(perm => {
          permissions[perm.key] = true;
        });
        break;
    }
    
    setSelectedPermissions(permissions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="text-blue-600" />
          Department Permission Management
        </h1>
        <p className="text-gray-600 mt-2">
          Select from predefined departments to manage user permissions and access controls. 
          Each department has its own set of specific permissions that can be assigned to users.
        </p>
      </div>

      {/* Department Selection */}
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Step 1: Select Department
        </h2>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Departments are predefined in the system. You can only assign permissions for existing departments.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Department Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Type *
            </label>
            <select
              value={selectedDepartmentType}
              onChange={(e) => {
                setSelectedDepartmentType(e.target.value as 'central' | 'school');
                setSelectedDepartmentId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="central">Central Departments</option>
              <option value="school">School Departments</option>
            </select>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Department *
            </label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Department --</option>
              {selectedDepartmentType === 'central' 
                ? centralDepts.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.departmentName}
                    </option>
                  ))
                : schools.flatMap((school) =>
                    school.departments?.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {school.facultyName} - {dept.departmentName}
                      </option>
                    )) || []
                  )
              }
            </select>
          </div>

          {/* Department Info */}
          <div className="flex items-end">
            {selectedDepartmentId && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 w-full">
                <div className="text-sm font-medium text-blue-900">
                  {getSelectedDepartmentName()}
                </div>
                <div className="text-xs text-blue-700">
                  {getDepartmentPermissions().length} permissions available
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permission Overview */}
      {selectedDepartmentId && getDepartmentPermissions().length > 0 && (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-600" />
            Step 2: Available Permissions for {getSelectedDepartmentName()}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupPermissionsByCategory(getDepartmentPermissions())).map(([category, perms]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  {category}
                </h3>
                <ul className="space-y-1">
                  {perms.map((perm) => (
                    <li key={perm.key} className="text-sm text-gray-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {perm.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Management */}
      {selectedDepartmentId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Step 3: Manage User Permissions
            </h2>
            <p className="text-gray-600 mt-1">
              Assign permissions to users for {getSelectedDepartmentName()}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Current Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  // Check if user has permissions for selected department
                  const hasPermissions = selectedDepartmentType === 'central' 
                    ? user.centralDeptPermissions.some(perm => perm.centralDeptId === selectedDepartmentId)
                    : user.schoolDeptPermissions.some(perm => perm.departmentId === selectedDepartmentId);
                  
                  const userPermissionCount = selectedDepartmentType === 'central'
                    ? user.centralDeptPermissions.find(perm => perm.centralDeptId === selectedDepartmentId)?.permissions || {}
                    : user.schoolDeptPermissions.find(perm => perm.departmentId === selectedDepartmentId)?.permissions || {};
                  
                  const activePermissions = Object.keys(userPermissionCount).filter(k => userPermissionCount[k]);

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${hasPermissions ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                          <User className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.employeeDetails?.displayName || user.uid}
                            </div>
                            <div className="text-sm text-gray-500">{user.uid}</div>
                            <div className="text-xs text-gray-400">
                              {user.role} • {user.employeeDetails?.designation || 'No designation'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {hasPermissions ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                ✓ {activePermissions.length} permissions
                              </span>
                              {selectedDepartmentType === 'central' && 
                               user.centralDeptPermissions.find(perm => perm.centralDeptId === selectedDepartmentId)?.isPrimary && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {activePermissions.slice(0, 3).join(', ')}
                              {activePermissions.length > 3 && ` +${activePermissions.length - 3} more`}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            No permissions assigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {hasPermissions ? (
                            <>
                              <button
                                onClick={() => openPermissionModal(user)}
                                className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm"
                              >
                                Edit Permissions
                              </button>
                              <button
                                onClick={() => handleRevoke(user.id, selectedDepartmentId, selectedDepartmentType)}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                              >
                                Revoke All
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openPermissionModal(user)}
                              className="px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 text-sm"
                            >
                              Grant Permissions
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Department Selected */}
      {!selectedDepartmentId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Department</h3>
          <p className="text-gray-500 mb-4">
            Choose from the predefined departments above to view and manage user permissions for that specific department.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left inline-block">
            <h4 className="font-medium text-gray-700 mb-2">Available Departments:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>• DRD (Research & Development)</div>
              <div>• HR (Human Resources)</div>
              <div>• Finance Department</div>
              <div>• Library Department</div>
              <div>• IT (Information Technology)</div>
              <div>• Admissions Office</div>
              <div>• Registrar Office</div>
              <div>• School Departments</div>
            </div>
          </div>
        </div>
      )}



      {/* Permission Assignment Modal */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Manage Permissions: {getSelectedDepartmentName()}
              </h2>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>User:</strong> {selectedUser.employeeDetails?.displayName} ({selectedUser.uid})
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Department: {getSelectedDepartmentName()} • 
                  Type: {selectedDepartmentType === 'central' ? 'Central Department' : 'School Department'}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPrimary" className="text-sm text-gray-700 flex items-center gap-2">
                    <span>Set as Primary Department (for reporting)</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Primary</span>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Select Permissions *
                    </h3>
                    
                    {/* Quick Presets */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => applyPermissionPreset('basic')}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                      >
                        Basic Access
                      </button>
                      <button
                        onClick={() => applyPermissionPreset('advanced')}
                        className="text-xs px-3 py-1 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors"
                      >
                        Advanced User
                      </button>
                      <button
                        onClick={() => applyPermissionPreset('full')}
                        className="text-xs px-3 py-1 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                      >
                        Full Administrator
                      </button>
                    </div>
                  </div>
                  
                  <div className="border rounded-xl p-4 max-h-96 overflow-y-auto bg-gray-50">
                    {Object.entries(groupPermissionsByCategory(getDepartmentPermissions())).map(
                      ([category, perms]) => (
                        <div key={category} className="mb-6 bg-white rounded-lg p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                              <Shield className="w-4 h-4 text-blue-500" />
                              {category}
                            </h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const categoryPerms: Record<string, boolean> = {};
                                  perms.forEach(perm => categoryPerms[perm.key] = true);
                                  setSelectedPermissions(prev => ({ ...prev, ...categoryPerms }));
                                }}
                                className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                              >
                                Select All
                              </button>
                              <button
                                onClick={() => {
                                  const categoryPerms: Record<string, boolean> = {};
                                  perms.forEach(perm => categoryPerms[perm.key] = false);
                                  setSelectedPermissions(prev => ({ ...prev, ...categoryPerms }));
                                }}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {perms.map((perm) => (
                              <label
                                key={perm.key}
                                className="flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 p-3 rounded-lg cursor-pointer border border-gray-100 hover:border-gray-200 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions[perm.key] || false}
                                  onChange={() => handlePermissionToggle(perm.key)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="flex-1">{perm.label}</span>
                                {selectedPermissions[perm.key] && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Permission Summary</h4>
                  <p className="text-sm text-gray-600">
                    {Object.values(selectedPermissions).filter(Boolean).length} permissions selected out of {getDepartmentPermissions().length} available
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowPermissionModal(false);
                      setSelectedPermissions({});
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGrantPermissions}
                    disabled={Object.values(selectedPermissions).filter(Boolean).length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
