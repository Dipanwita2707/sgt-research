require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTestUsers() {
  try {
    // Create test users for auto-fill functionality
    const testUsers = [
      {
        uid: 'STU123456789',
        email: 'john.student@sgt.edu',
        role: 'student',
        passwordHash: '$2b$12$defaulthashfortesting',
        employeeDetails: {
          create: {
            empId: 'STU123456789',
            firstName: 'John',
            lastName: 'Student',
            designation: 'Student',
            email: 'john.student@sgt.edu',
            phoneNumber: '9876543210'
          }
        }
      },
      {
        uid: 'FAC987654321',
        email: 'jane.faculty@sgt.edu',
        role: 'faculty',
        passwordHash: '$2b$12$defaulthashfortesting',
        employeeDetails: {
          create: {
            empId: 'FAC987654321',
            firstName: 'Jane',
            lastName: 'Faculty',
            designation: 'Assistant Professor',
            email: 'jane.faculty@sgt.edu',
            phoneNumber: '9876543211'
          }
        }
      },
      {
        uid: 'STF12345',
        email: 'mike.staff2@sgt.edu',
        role: 'staff',
        passwordHash: '$2b$12$defaulthashfortesting',
        employeeDetails: {
          create: {
            empId: 'STF12345',
            firstName: 'Mike',
            lastName: 'Staff',
            designation: 'Technical Assistant',
            email: 'mike.staff2@sgt.edu',
            phoneNumber: '9876543212'
          }
        }
      }
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.userLogin.findFirst({
        where: { uid: userData.uid }
      });

      if (!existingUser) {
        await prisma.userLogin.create({
          data: userData
        });
        console.log(`✅ Created test user: ${userData.uid}`);
      } else {
        console.log(`⚠️ User already exists: ${userData.uid}`);
      }
    }

    console.log('🎉 Test users seeded successfully!');
    console.log('You can now test auto-fill with:');
    console.log('- STU123456789 (Student)');
    console.log('- FAC987654321 (Faculty)');
    console.log('- STF555666777 (Staff)');

  } catch (error) {
    console.error('❌ Error seeding test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestUsers();