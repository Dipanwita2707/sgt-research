# SGT University Management System (UMS)

A modular, scalable University Management System built with modern web technologies for SGT University.

## 🏗️ Architecture Overview

The system follows a **modular architecture** where each module is independent and can be developed, tested, and deployed without affecting other modules.

### Backend Structure
```
backend/
├── src/
│   ├── config/              # Centralized configuration
│   │   ├── app.config.js    # Application settings
│   │   └── database.js      # Prisma client setup
│   ├── master/              # Core system modules
│   │   ├── controllers/     # Authentication, Dashboard, Permissions
│   │   └── routes/          # Master system routes
│   ├── modules/             # Feature modules
│   │   └── research-patent/ # Research & Patent Management
│   │       ├── controllers/
│   │       └── routes/
│   ├── middleware/          # Auth & validation middleware
│   ├── database/            # Database utilities
│   │   └── seed.js          # Database seeding script
│   └── server.js            # Express server entry point
├── prisma/
│   └── schema.prisma        # Database schema
└── package.json
```

### Frontend Structure
```
frontend/
├── src/
│   ├── app/                 # Next.js 14 app directory
│   │   ├── login/           # Login page
│   │   └── dashboard/       # Dashboard page
│   ├── components/          # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ModuleCard.tsx
│   ├── services/            # API service layer
│   │   └── auth.service.ts
│   ├── store/               # Zustand state management
│   │   ├── authStore.ts
│   │   └── dashboardStore.ts
│   ├── lib/                 # Utilities
│   │   └── api.ts           # Axios configuration
│   └── styles/
│       └── globals.css      # Global styles with Tailwind
└── package.json
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 4.18.2
- **Database**: PostgreSQL with Prisma ORM 5.22.0
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, express-rate-limit
- **Validation**: express-validator

### Frontend
- **Framework**: Next.js 14.0.4 (React 18.2.0)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.3.0
- **State Management**: Zustand 4.4.7
- **HTTP Client**: Axios 1.6.2
- **Icons**: lucide-react
- **Forms**: react-hook-form

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```powershell
   cd backend
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure environment variables**
   - Update `.env` file with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/sgt_university"
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Setup database**
   ```powershell
   # Create database migrations
   npx prisma migrate dev --name init
   
   # Generate Prisma Client
   npx prisma generate
   
   # Seed database with test data
   node src/database/seed.js
   ```

5. **Start development server**
   ```powershell
   npm run dev
   ```
   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```powershell
   cd frontend
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure environment variables**
   - Update `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Start development server**
   ```powershell
   npm run dev
   ```
   Frontend will run on `http://localhost:3000`

## 👤 Test User Credentials

After seeding the database, you can login with:

| Role | UID/RegNo | Password | Email |
|------|-----------|----------|-------|
| **Superadmin** | admin | admin123 | admin@sgtuniversity.edu |
| **Faculty** | FAC001 | faculty123 | faculty@sgtuniversity.edu |
| **Staff** | STF001 | staff123 | staff@sgtuniversity.edu |
| **Student** | STU123456789 | student123 | student@sgtuniversity.edu |

## 🎯 Key Features

### Implemented Features

1. **Authentication System**
   - JWT-based authentication
   - Secure password hashing with bcrypt
   - Cookie-based session management
   - Login/Logout functionality
   - Password change

2. **Role-Based Access**
   - Superadmin, Admin, Faculty, Staff, Student, Parent roles
   - Department-based permissions (ADMISSION, REGISTRAR, HR_TEACHING, HR_NON_TEACHING)
   - Checkbox-based permission system (not role-based)

3. **Dashboard System**
   - Role-specific module visibility
   - User statistics and metrics
   - Module cards with permission counts
   - Responsive design (mobile, tablet, laptop friendly)

4. **Permission Management**
   - Grant/revoke department permissions
   - JSON-based flexible permission structure
   - Per-user permission tracking
   - Audit logging for permission changes

5. **Research & Patent Module** (First Module)
   - Research paper management
   - Patent application tracking
   - Review workflow
   - Status management

### Core System Modules (Master)

Located in `backend/src/master/`:
- **Authentication**: Login, logout, password management
- **Dashboard**: User dashboard with role-based modules
- **Permissions**: Department permission management

### Feature Modules

Located in `backend/src/modules/`:
- **Research & Patent Management**: First feature module for managing research papers and patents

## 🔐 Database Schema

The system uses the existing SGT University database schema with the following key tables:

- **UserLogin**: Main authentication table (uid, email, passwordHash, role)
- **EmployeeDetails**: Staff/Faculty information
- **StudentDetails**: Student information with 9-digit registration numbers
- **FacultySchoolList**: Faculty/School organizational structure
- **Department**: Academic departments
- **Program**: Academic programs (B.Tech, M.Tech, etc.)
- **Section**: Class sections
- **UserDepartmentPermission**: Department-based permissions
- **AuditLog**: System audit trail
- **ChangeHistory**: Data change tracking

### User Identification

- **Students**: 9-digit registration number (e.g., 123456789)
- **Staff/Faculty**: Variable-length UID (e.g., FAC001, STF001)
- No RFID card functionality (excluded from implementation)

## 🚀 Development Workflow

### Adding a New Module

1. **Create module structure**
   ```
   backend/src/modules/your-module-name/
   ├── controllers/
   │   └── yourModule.controller.js
   └── routes/
       └── index.js
   ```

2. **Define routes**
   ```javascript
   // backend/src/modules/your-module-name/routes/index.js
   const express = require('express');
   const router = express.Router();
   const { protect, checkDepartmentPermission } = require('../../../middleware/auth');
   const yourController = require('../controllers/yourModule.controller');

   router.get('/', protect, yourController.getAll);
   router.post('/', protect, checkDepartmentPermission('REGISTRAR'), yourController.create);

   module.exports = router;
   ```

3. **Register in server.js**
   ```javascript
   // Automatically loaded via dynamic import in src/server.js
   ```

4. **Test independently** without affecting other modules

### Database Changes

1. **Update Prisma schema**
   ```prisma
   // prisma/schema.prisma
   model YourNewTable {
     id        String   @id @default(uuid())
     // ... fields
   }
   ```

2. **Generate migration**
   ```powershell
   npx prisma migrate dev --name add_your_table
   ```

3. **Generate Prisma Client**
   ```powershell
   npx prisma generate
   ```

## 📱 Responsive Design

All frontend components are mobile, tablet, and laptop friendly using Tailwind CSS responsive classes:

- **Mobile**: Base styles, `sm:` prefix (640px+)
- **Tablet**: `md:` prefix (768px+)
- **Laptop**: `lg:` prefix (1024px+)
- **Desktop**: `xl:` prefix (1280px+)

Example:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Responsive grid: 1 col on mobile, 2 on tablet, 3 on laptop */}
</div>
```

## 🔧 Useful Commands

### Backend
```powershell
npm run dev          # Start development server
npm start            # Start production server
npx prisma studio    # Open Prisma Studio (Database GUI)
npx prisma migrate dev    # Create and apply migration
npx prisma generate  # Regenerate Prisma Client
node src/database/seed.js # Seed database
```

### Frontend
```powershell
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🛡️ Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Protection against brute force attacks
- **Helmet**: HTTP security headers
- **CORS**: Configured for allowed origins
- **Input Validation**: express-validator for request validation
- **Audit Logging**: All critical operations logged

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/modules` - Get user's modules

### Permissions
- `GET /api/permissions` - Get user permissions
- `GET /api/permissions/:userId` - Get user's permissions
- `POST /api/permissions/grant` - Grant permissions (admin only)
- `DELETE /api/permissions/revoke` - Revoke permissions (admin only)

### Research & Patent Module
- `GET /api/modules/research-patent/papers` - Get all research papers
- `POST /api/modules/research-patent/papers` - Create research paper
- `GET /api/modules/research-patent/papers/:id` - Get paper details
- `PUT /api/modules/research-patent/papers/:id` - Update paper
- `DELETE /api/modules/research-patent/papers/:id` - Delete paper
- `POST /api/modules/research-patent/papers/:id/review` - Review paper
- Similar endpoints for patents

## 🤝 Contributing

When adding new features:
1. Follow the modular architecture pattern
2. Keep controllers in `controllers/` folder
3. Keep routes in `routes/` folder
4. Use Prisma for database operations
5. Add proper authentication and permission checks
6. Create audit logs for important operations
7. Ensure responsive design for frontend components

## 📝 License

This project is proprietary software developed for SGT University.

## 🆘 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for SGT University**
