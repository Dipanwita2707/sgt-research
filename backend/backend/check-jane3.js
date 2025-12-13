require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.userLogin.findFirst({
      where: { email: 'jane@gmail.com' },
      include: {
        employeeDetails: {
          include: {
            primarySchool: true,
            primaryDepartment: true,
            primaryCentralDept: true
          }
        },
        centralDeptPermissions: {
          include: {
            centralDepartment: true
          }
        }
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
