require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJane() {
  try {
    const user = await prisma.userLogin.findFirst({
      where: { email: 'jane.faculty@sgt.edu' },
      select: {
        uid: true,
        email: true,
        role: true,
        employeeDetails: {
          select: {
            firstName: true,
            lastName: true,
            primarySchoolId: true,
            primaryDepartmentId: true,
            primaryCentralDeptId: true,
            primarySchool: { select: { facultyName: true } },
            primaryDepartment: { select: { departmentName: true } },
            primaryCentralDept: { select: { departmentName: true } }
          }
        }
      }
    });
    console.log('Jane User Data:', JSON.stringify(user, null, 2));
    
    const schools = await prisma.faculty.findMany({
      select: { facultyId: true, facultyName: true }
    });
    console.log('\nAvailable Schools:', JSON.stringify(schools, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.disconnect();
  }
}

checkJane();
