# Permission Management System

## Current Access Control

### Superadmin Only (Current Implementation)
All permission management is currently restricted to **Superadmin** role only.

**Accessible Endpoints:**
- `GET /api/designations/templates` - View all designation templates
- `GET /api/designations/templates/:designation` - View specific designation permissions
- `GET /api/designations/users/:userId/permissions` - View user permissions
- `PUT /api/designations/users/:userId/permissions` - Update user permissions
- `POST /api/designations/users/:userId/apply-template` - Apply designation template
- `GET /api/users` - List all users for permission management
- `GET /api/users/:userId` - View specific user details
- `POST /api/permissions/grant` - Grant permissions to user
- `POST /api/permissions/revoke` - Revoke permissions from user

### Future: HR Module Transfer
When the HR module is implemented, permission management will be transferred to HR personnel:

**Planned Changes:**
1. Create dedicated HR module at `backend/src/modules/hr/`
2. Add HR role-based access to permission endpoints
3. Transfer user management to HR department
4. Keep superadmin access for system-level overrides

**Implementation Notes:**
- Add `hr_manager` and `hr_admin` roles to UserRoleEnum
- Update `restrictTo()` middleware calls to include HR roles
- Create HR-specific permission templates
- Add department-level permission delegation

## Permission Categories

### 11 Categories with 70+ Permissions:

1. **Student Management** (7 permissions)
2. **Faculty Management** (6 permissions)
3. **Staff Management** (5 permissions)
4. **Admissions** (5 permissions)
5. **Academics** (6 permissions)
6. **Examinations** (5 permissions)
7. **Research & Patents** (5 permissions)
8. **Library Management** (4 permissions)
9. **Finance** (5 permissions)
10. **Reports & Analytics** (4 permissions)
11. **System Administration** (6 permissions)

## Designation Templates

### Pre-configured roles with auto-assigned permissions:

**Administrative:**
- Registrar
- Assistant Registrar
- System Administrator

**Admissions:**
- Admission Head
- Admission Officer

**Human Resources:**
- HR Manager
- HR Executive

**Academic:**
- Dean
- HOD (Head of Department)
- Professor
- Assistant Professor

**Finance:**
- Finance Manager
- Accountant

**Support:**
- Librarian

## Usage

### For Superadmin:

1. **View Permission Management Page:**
   ```
   Navigate to: /permissions
   ```

2. **Select User to Manage:**
   - Search by name, UID, or email
   - Filter by role
   - Click "Manage Permissions"

3. **Assign Permissions:**
   - Auto-selected (blue): From designation template
   - Custom (green): Manually added by admin
   - Use "Select All" / "Deselect All" per category
   - Click "Save Permissions"

4. **Apply Designation Template:**
   ```javascript
   POST /api/designations/users/:userId/apply-template
   {
     "designation": "Registrar"
   }
   ```

## Migration Path to HR Module

### Phase 1: Create HR Module Structure
```
backend/src/modules/hr/
├── controllers/
│   ├── employee.controller.js
│   ├── designation.controller.js (moved from master)
│   └── permission.controller.js (moved from master)
└── routes/
    └── index.js
```

### Phase 2: Add HR Roles
Update Prisma schema:
```prisma
enum UserRoleEnum {
  superadmin
  admin
  hr_manager
  hr_admin
  student
  faculty
  staff
  parent
}
```

### Phase 3: Update Access Control
Replace:
```javascript
restrictTo('superadmin')
```
With:
```javascript
restrictTo('superadmin', 'hr_manager', 'hr_admin')
```

### Phase 4: Department-Level Delegation
Allow HR managers to manage permissions for their department only:
```javascript
// Check if HR user has permission for target user's department
if (req.user.role === 'hr_manager') {
  await checkHRDepartmentAccess(req.user, targetUser);
}
```

## Current Login Credentials

**Superadmin Account:**
- UID: `admin`
- Password: `admin123`
- Full access to permission management

## Notes

- All permission changes are logged in `AuditLog` table
- Permissions are stored as JSON in `UserDepartmentPermission.permissions`
- Designation defaults don't override existing custom permissions
- Effective permissions = Designation defaults + Custom permissions
