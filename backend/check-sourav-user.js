const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.userLogin.findFirst({
      where: { email: 'sourav@gmail.com' },
      include: {
        employeeDetails: {
          include: {
            primarySchool: true,
            primaryDepartment: true,
            primaryCentralDept: true
          }
        }
      }
    });

    console.log('\n=== USER DATA ===');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Has EmployeeDetails:', !!user.employeeDetails);
    
    if (user.employeeDetails) {
      console.log('\n=== EMPLOYEE DETAILS ===');
      console.log('primarySchoolId:', user.employeeDetails.primarySchoolId);
      console.log('primaryDepartmentId:', user.employeeDetails.primaryDepartmentId);
      console.log('primaryCentralDeptId:', user.employeeDetails.primaryCentralDeptId);
      
      console.log('\n=== RELATIONS ===');
      console.log('primarySchool:', user.employeeDetails.primarySchool);
      console.log('primaryDepartment:', user.employeeDetails.primaryDepartment);
      console.log('primaryCentralDept:', user.employeeDetails.primaryCentralDept);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
