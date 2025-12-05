# SGT University Management System - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Initial Setup

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
Copy-Item .env.example .env

# Edit .env file with your database credentials
# notepad .env

# Run database migration
npm run migrate

# Seed initial data (creates test users)
npm run seed

# Start development server
npm run dev
```

The backend server will run on `http://localhost:5000`

### 2. Frontend Setup

```powershell
# Navigate to frontend directory (from root)
cd ..\frontend

# Install dependencies
npm install

# Create .env.local file
Copy-Item .env.example .env.local

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## Database Setup

### Create PostgreSQL Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE sgt_ums;

-- Exit psql
\q
```

### Run Migrations

The migration script will create all necessary tables:

```powershell
cd backend
npm run migrate
```

### Seed Test Data

```powershell
npm run seed
```

This creates three test accounts:
- **Admin**: username: `admin`, password: `admin123`
- **Student**: username: `123456789`, password: `student123`
- **Staff**: username: `12345`, password: `staff123`

## Project Structure

```
sgt/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── database/       # DB connection & migrations
│   │   ├── middleware/     # Auth & validation
│   │   ├── modules/        # Feature modules
│   │   │   └── research-patent/
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Helper functions
│   │   └── server.js       # Entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/               # Next.js app
    ├── src/
    │   ├── app/           # App router pages
    │   ├── components/    # Reusable components
    │   ├── lib/          # Utilities
    │   ├── services/     # API services
    │   ├── store/        # State management
    │   └── styles/       # Global styles
    ├── .env.example
    └── package.json
```

## Features Implemented

### ✅ Authentication System
- JWT-based authentication
- Login with username (student reg/staff UID)
- Password change functionality
- Session management
- Account lockout after failed attempts

### ✅ Permission System
- Checkbox-based permissions
- Module-level access control
- Default permissions by role
- Admin can manage permissions

### ✅ Master Dashboard
- Separate views for students/staff
- Module cards with permissions
- User profile information
- Permission overview

### ✅ Research & Patent Module (Template)
- Research paper management
- Patent application tracking
- Status workflow
- Review system for staff

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/change-password` - Change password

### Dashboard
- `GET /api/v1/dashboard` - Get dashboard data
- `GET /api/v1/dashboard/modules` - Get available modules

### Permissions
- `GET /api/v1/permissions/user/:userId` - Get user permissions
- `GET /api/v1/permissions/all` - Get all permissions
- `POST /api/v1/permissions/grant` - Grant permissions (admin)
- `POST /api/v1/permissions/revoke` - Revoke permissions (admin)

### Research & Patent Module
- `GET /api/v1/research/papers` - List research papers
- `POST /api/v1/research/papers` - Create paper
- `GET /api/v1/research/papers/:id` - Get paper details
- `PUT /api/v1/research/papers/:id` - Update paper
- `DELETE /api/v1/research/papers/:id` - Delete paper
- `POST /api/v1/research/papers/:id/review` - Review paper

## Adding New Modules

### 1. Backend Module Structure

```
backend/src/modules/your-module/
├── your-module.routes.js      # Routes
├── your-module.controller.js  # Business logic
├── schema.sql                 # Database schema
└── README.md                  # Module documentation
```

### 2. Register Module Routes

Edit `backend/src/server.js`:

```javascript
const yourModuleRoutes = require('./modules/your-module/your-module.routes');
app.use(`${API_PREFIX}/your-module`, yourModuleRoutes);
```

### 3. Add Module to Database

```sql
INSERT INTO modules (name, slug, description, icon, route, display_order)
VALUES ('Your Module', 'your-module', 'Description', 'IconName', '/modules/your-module', 2);
```

### 4. Add Permissions

```sql
INSERT INTO permissions (module_id, permission_name, permission_key, description)
SELECT id, 'View Data', 'your-module.view', 'Can view data'
FROM modules WHERE slug = 'your-module';
```

## Development Guidelines

### Code Organization
- Keep modules isolated in their own directories
- Use middleware for permission checks
- Follow RESTful API conventions
- Use transactions for multi-step operations

### Security Best Practices
- Always validate input
- Use parameterized queries
- Check permissions on every protected route
- Log important actions in audit_logs

### Frontend Components
- Create reusable components
- Use TypeScript for type safety
- Implement loading states
- Handle errors gracefully

## Testing

```powershell
# Backend tests (when implemented)
cd backend
npm test

# Frontend tests (when implemented)
cd frontend
npm test
```

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in .env
2. Use strong JWT_SECRET
3. Configure production database
4. Enable HTTPS
5. Set up proper CORS

### Frontend
1. Build production bundle: `npm run build`
2. Configure API URL
3. Deploy to Vercel/Netlify or custom server

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check credentials in .env
- Ensure database exists

### Port Already in Use
```powershell
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Dependencies Issues
```powershell
# Clear and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

## Support & Documentation

- Backend API: http://localhost:5000/api/v1
- Frontend: http://localhost:3000
- Database: PostgreSQL on port 5432

## License

Proprietary - SGT University
