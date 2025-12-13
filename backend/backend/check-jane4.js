require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.userLogin.findFirst({
      where: { email: 'jane@gmail.com' },
      select: {
        uid: true,
        email: true,
        role: true,
        employeeDetails: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            primarySchool: { select: { name: true } },
            primaryDepartment: { select: { name: true } },
            primaryCentralDept: { select: { name: true } }
          }
        },
        centralDeptPermissions: {
          select: {
            centralDept: { select: { name: true } },
            permissions: true
          }
        }
      }
    });
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
