# Quick Start Guide - SGT UMS

## Prerequisites Checklist
- [ ] Node.js v18+ installed
- [ ] PostgreSQL v14+ installed and running
- [ ] Git installed
- [ ] Terminal/PowerShell access

## 🚀 Setup in 5 Minutes

### Step 1: Database Setup
```powershell
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE sgt_university;
\q
```

### Step 2: Backend Setup
```powershell
# Navigate to backend
cd backend

# Update .env file with your PostgreSQL credentials
# DATABASE_URL="postgresql://postgres:password@localhost:5432/sgt_university"

# Install dependencies (already done)
# npm install

# Generate Prisma Client (already done)
# npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev --name init

# Seed the database with test users
node src/database/seed.js

# Start backend server
npm run dev
```

Backend runs at: `http://localhost:5000`

### Step 3: Frontend Setup (New Terminal)
```powershell
# Navigate to frontend
cd frontend

# Install dependencies (already done)
# npm install

# Start frontend development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

## 🎉 You're Ready!

Visit `http://localhost:3000` and login with:

**Superadmin**: `admin` / `admin123`

## 🔧 Common Issues

### Database Connection Failed
- Ensure PostgreSQL is running
- Check DATABASE_URL in `backend/.env`
- Verify database exists: `psql -U postgres -l`

### Port Already in Use
```powershell
# Backend (Port 5000)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Frontend (Port 3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma Client Not Generated
```powershell
cd backend
npx prisma generate
```

### Module Not Found Errors
```powershell
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## 📚 Next Steps

1. **Explore the Dashboard**: Login and check available modules
2. **Check API Documentation**: See README.md for all endpoints
3. **Add Your First Module**: Follow the "Adding a New Module" guide in README.md
4. **Customize Permissions**: Use the permission system to grant access

## 🔗 Useful URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Prisma Studio: Run `npx prisma studio` in backend folder
- API Health: http://localhost:5000/health

## 💡 Development Tips

1. **Keep both terminals open**: One for backend, one for frontend
2. **Use Prisma Studio**: Visual database editor (`npx prisma studio`)
3. **Check backend logs**: Watch for API errors in backend terminal
4. **Use browser DevTools**: Check Network tab for API calls
5. **Auto-reload**: Both servers auto-reload on file changes

## 📞 Need Help?

- Check the main README.md for detailed documentation
- Review error logs in the terminal
- Verify all environment variables are set correctly

---

**Happy Coding! 🎓**
