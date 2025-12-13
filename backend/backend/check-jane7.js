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
            primarySchool: { select: { facultyName: true } },
            primaryDepartment: { select: { departmentName: true } },
            primaryCentralDept: { select: { departmentName: true } }
          }
        },
        centralDeptPermissions: {
          select: {
            centralDept: { select: { departmentName: true } },
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
