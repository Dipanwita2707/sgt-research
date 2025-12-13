require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.userLogin.findFirst({
      where: { email: 'jane@gmail.com' },
      include: {
        employeeDetails: true,
        facultyDetails: {
          include: {
            school: true,
            department: true
          }
        },
        centralDepartmentPermission: true
      }
    });
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
