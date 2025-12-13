/**
 * IPR, Research & DRD Permission Configuration
 * Simplified to 4 core IPR permissions + 4 Research permissions
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
        label: 'Assign Schools to DRD Members (IPR)',
        description: 'DRD Head - Can assign schools to DRD member reviewers for IPR'
      }
    }
  }
};

// Research Contribution Permissions - 4 checkboxes (parallel to IPR)
const RESEARCH_PERMISSIONS = {
  RESEARCH_CORE: {
    category: 'Research Permissions',
    permissions: {
      research_file_new: {
        key: 'research_file_new',
        label: 'Research Filing',
        description: 'Can file new research contributions (Faculty/Student have this by default)'
      },
      research_review: {
        key: 'research_review',
        label: 'Research Review',
        description: 'DRD Member - Can review research contributions from assigned schools'
      },
      research_approve: {
        key: 'research_approve',
        label: 'Research Approve',
        description: 'DRD Head - Can give final approval/rejection on research contributions'
      },
      research_assign_school: {
        key: 'research_assign_school',
        label: 'Assign Schools to DRD Members (Research)',
        description: 'DRD Head - Can assign schools to DRD member reviewers for Research'
      }
    }
  }
};

// Flat list of all permission keys for validation
const ALL_IPR_PERMISSION_KEYS = Object.values(IPR_PERMISSIONS)
  .flatMap(category => Object.keys(category.permissions));

const ALL_RESEARCH_PERMISSION_KEYS = Object.values(RESEARCH_PERMISSIONS)
  .flatMap(category => Object.keys(category.permissions));

const ALL_PERMISSION_KEYS = [...ALL_IPR_PERMISSION_KEYS, ...ALL_RESEARCH_PERMISSION_KEYS];

// Get all permissions as flat array for API response
const getPermissionsForUI = () => {
  const iprPerms = Object.entries(IPR_PERMISSIONS).map(([groupKey, group]) => ({
    groupKey,
    category: group.category,
    permissions: Object.values(group.permissions)
  }));
  
  const researchPerms = Object.entries(RESEARCH_PERMISSIONS).map(([groupKey, group]) => ({
    groupKey,
    category: group.category,
    permissions: Object.values(group.permissions)
  }));
  
  return [...iprPerms, ...researchPerms];
};

// Validate permission keys
const isValidPermission = (key) => ALL_PERMISSION_KEYS.includes(key);

// Get default permissions by role
// Faculty and Students can file IPR and Research by default (inherent right)
// Staff and Admin do NOT get filing by default - they need explicit checkbox
// Admin is IT head - manages users/permissions, NOT IPR/Research operations
const getDefaultPermissions = (role) => {
  const defaults = {
    student: {
      ipr_file_new: true,      // Students can file IPR by default
      research_file_new: true  // Students can file Research by default
    },
    faculty: {
      ipr_file_new: true,      // Faculty can file IPR by default
      research_file_new: true  // Faculty can file Research by default
    },
    staff: {
      // Staff do NOT get any IPR/Research permissions by default
      // They need explicit permission from admin checkbox
    },
    admin: {
      // Admin is IT head - manages users/permissions/analytics
      // Does NOT get IPR/Research operational permissions by default
      // Can assign permissions to others, but cannot file/review/approve
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
  'PUT /api/v1/drd-member/assign-schools/:userId': ['ipr_assign_school'],
  
  // Research Contribution Filing Routes
  'POST /api/v1/research/create': ['research_file_new'],
  'GET /api/v1/research/my-contributions': ['research_file_new'],
  
  // Research Review Routes (DRD Member)
  'GET /api/v1/research-review/pending': ['research_review', 'research_approve'],
  'POST /api/v1/research-review/review/:id': ['research_review'],
  'POST /api/v1/research-review/request-changes/:id': ['research_review'],
  
  // Research Approval Routes (DRD Head)
  'POST /api/v1/research-review/approve/:id': ['research_approve'],
  'POST /api/v1/research-review/reject/:id': ['research_approve'],
  
  // Research School Assignment Routes (DRD Head)
  'POST /api/v1/research-member/assign-schools': ['research_assign_school'],
  'PUT /api/v1/research-member/assign-schools/:userId': ['research_assign_school']
};

module.exports = {
  IPR_PERMISSIONS,
  RESEARCH_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  ALL_IPR_PERMISSION_KEYS,
  ALL_RESEARCH_PERMISSION_KEYS,
  getPermissionsForUI,
  isValidPermission,
  getDefaultPermissions,
  ROUTE_PERMISSION_MAP
};
