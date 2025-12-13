const express = require('express');
const router = express.Router();

// Import individual route files
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const permissionRoutes = require('./permission.routes');
const permissionManagementRoutes = require('./permissionManagement.routes');
const designationRoutes = require('./designation.routes');
const userRoutes = require('./user.routes');
const schoolRoutes = require('./school.routes');
const centralDepartmentRoutes = require('./centralDepartment.routes');
const departmentRoutes = require('./department.routes');
const programRoutes = require('./program.routes');
const employeeRoutes = require('./employee.routes');
const studentRoutes = require('./student.routes');
const bulkUploadRoutes = require('./bulkUpload.routes');
const analyticsRoutes = require('./analytics.routes');

// IPR & Research Paper Module Routes
const iprRoutes = require('./ipr.routes');
const iprManagementRoutes = require('./ipr');
const drdReviewRoutes = require('./drdReview.routes');
const deanApprovalRoutes = require('./deanApproval.routes');
const financeRoutes = require('./finance.routes');
const collaborativeEditingRoutes = require('./collaborativeEditing.routes');
const googleDocsRoutes = require('./googleDocs.routes');
const notificationRoutes = require('./notification.routes');
const incentivePolicyRoutes = require('./incentivePolicy.routes');

// Research Contribution Module Routes
const researchContributionRoutes = require('./researchContribution.routes');
// const fileUploadRoutes = require('./fileUpload.routes'); // TODO: Install @aws-sdk/client-s3 first

// Mount routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/permissions', permissionRoutes); // Old permission system
router.use('/permission-management', permissionManagementRoutes); // New granular permission system
router.use('/designations', designationRoutes);
router.use('/users', userRoutes); // Admin only - will transfer to HR module
router.use('/schools', schoolRoutes); // Admin only - manage schools/faculties
router.use('/central-departments', centralDepartmentRoutes); // Admin only - manage central departments
router.use('/departments', departmentRoutes); // Admin only - manage departments under schools
router.use('/programs', programRoutes); // Admin only - manage programs under departments
router.use('/employees', employeeRoutes); // Admin only - manage faculty/staff
router.use('/students', studentRoutes); // Admin only - manage students
router.use('/bulk-upload', bulkUploadRoutes); // Admin bulk upload for schools, departments, users
router.use('/analytics', analyticsRoutes); // Admin university analytics

// IPR & Research Paper Module
router.use('/ipr', iprRoutes); // IPR application management
router.use('/ipr-management', iprManagementRoutes); // New IPR management system
router.use('/drd-review', drdReviewRoutes); // DRD team member review workflow
router.use('/dean-approval', deanApprovalRoutes); // Dean approval workflow
router.use('/finance', financeRoutes); // Finance audit and incentive processing
router.use('/collaborative-editing', collaborativeEditingRoutes); // Real-time collaborative editing
router.use('/google-docs', googleDocsRoutes); // Google Docs-style change tracking
router.use('/notifications', notificationRoutes); // User notifications
router.use('/incentive-policies', incentivePolicyRoutes); // Admin incentive policy management
router.use('/research-policies', require('./researchPolicy.routes')); // Research paper incentive policy management
router.use('/file-upload', require('./fileUpload.routes')); // S3 file upload service

// Research Contribution Module
router.use('/research', researchContributionRoutes); // Research paper, book, conference, grant submissions

module.exports = router;
