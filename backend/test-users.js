require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUsers() {
  try {
    const users = await prisma.userLogin.findMany({
      select: {
        uid: true,
        role: true,
        employeeDetails: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        }
      }
    });

    console.log('Found users:');
    users.forEach(user => {
      console.log(`UID: ${user.uid}, Role: ${user.role}, Name: ${user.employeeDetails?.firstName || 'N/A'} ${user.employeeDetails?.lastName || ''}`);
    });

    // Test the specific user
    const testUser = await prisma.userLogin.findFirst({
      where: { uid: 'STU123456789' },
      include: { employeeDetails: true }
    });

    console.log('\nSTU123456789 exists:', !!testUser);
    if (testUser) {
      console.log('User details:', JSON.stringify(testUser, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUsers();