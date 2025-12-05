/**
 * IPR & DRD Permission Configuration
 * Simplified to 4 core IPR permissions
 */

const IPR_PERMISSIONS = {
  // Core IPR Permissions - Only 4 checkboxes
  IPR_CORE: {
    category: 'IPR Permissions',
    permissions: {
      ipr_file_new: {
        key: 'ipr_file_new',
        label: 'IPR Filing',
        description: 'Can file new IPR applications (Faculty/Student have this by default)'
      },
      ipr_review: {
        key: 'ipr_review',
        label: 'IPR Review',
        description: 'DRD Member - Can review IPR applications from assigned schools'
      },
      ipr_approve: {
        key: 'ipr_approve',
        label: 'IPR Approve',
        description: 'DRD Head - Can give final approval/rejection on IPR applications'
      },
      ipr_assign_school: {
        key: 'ipr_assign_school',
        label: 'Assign Schools to DRD Members',
        description: 'DRD Head - Can assign schools to DRD member reviewers'
      }
    }
  }
};

// Flat list of all permission keys for validation
const ALL_PERMISSION_KEYS = Object.values(IPR_PERMISSIONS)
  .flatMap(category => Object.keys(category.permissions));

// Get all permissions as flat array for API response
const getPermissionsForUI = () => {
  return Object.entries(IPR_PERMISSIONS).map(([groupKey, group]) => ({
    groupKey,
    category: group.category,
    permissions: Object.values(group.permissions)
  }));
};

// Validate permission keys
const isValidPermission = (key) => ALL_PERMISSION_KEYS.includes(key);

// Get default permissions by role
// Faculty and Students can file IPR by default (inherent right)
// Staff and Admin do NOT get IPR filing by default - they need explicit checkbox
// Admin is IT head - manages users/permissions, NOT IPR operations
const getDefaultPermissions = (role) => {
  const defaults = {
    student: {
      ipr_file_new: true  // Students can file IPR by default
    },
    faculty: {
      ipr_file_new: true  // Faculty can file IPR by default
    },
    staff: {
      // Staff do NOT get any IPR permissions by default
      // They need explicit permission from admin checkbox
    },
    admin: {
      // Admin is IT head - manages users/permissions/analytics
      // Does NOT get IPR operational permissions by default
      // Can assign permissions to others, but cannot file/review/approve IPR
    }
  };

  return defaults[role] || {};
};

// Permission mapping for route protection
const ROUTE_PERMISSION_MAP = {
  // IPR Filing Routes
  'POST /api/v1/ipr/create': ['ipr_file_new'],
  'GET /api/v1/ipr/my-applications': ['ipr_file_new'],
  
  // DRD Review Routes (DRD Member)
  'GET /api/v1/drd-review/pending': ['ipr_review', 'ipr_approve'],
  'POST /api/v1/drd-review/review/:id': ['ipr_review'],
  'POST /api/v1/drd-review/recommend/:id': ['ipr_review'],
  
  // DRD Head Approval Routes
  'POST /api/v1/drd-review/head-approve/:id': ['ipr_approve'],
  'POST /api/v1/drd-review/govt-application/:id': ['ipr_approve'],
  'POST /api/v1/drd-review/publication/:id': ['ipr_approve'],
  
  // School Assignment Routes (DRD Head)
  'POST /api/v1/drd-member/assign-schools': ['ipr_assign_school'],
  'PUT /api/v1/drd-member/assign-schools/:userId': ['ipr_assign_school']
};

module.exports = {
  IPR_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  getPermissionsForUI,
  isValidPermission,
  getDefaultPermissions,
  ROUTE_PERMISSION_MAP
};
