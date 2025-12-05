require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Use a simple hash for testing
    const passwordHash = '$2b$12$defaulthashfortesting12345';
    
    // Check if user already exists
    const existingUser = await prisma.userLogin.findFirst({
      where: { uid: '12345' }
    });

    if (existingUser) {
      console.log('⚠️ User with UID 12345 already exists');
      return;
    }

    // Create user with UID and password 12345
    const user = await prisma.userLogin.create({
      data: {
        uid: '12345',
        email: 'test12345@sgt.edu',
        role: 'student',
        passwordHash: passwordHash,
        employeeDetails: {
          create: {
            empId: '12345',
            firstName: 'Test',
            lastName: 'Student',
            designation: 'Student',
            email: 'test12345@sgt.edu',
            phoneNumber: '1234567890'
          }
        }
      }
    });

    console.log('✅ Created test user:');
    console.log('UID: 12345');
    console.log('Password: 12345');
    console.log('Role: student');
    console.log('Email: test12345@sgt.edu');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();