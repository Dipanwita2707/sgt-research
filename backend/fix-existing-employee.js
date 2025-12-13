// Script to fix existing employee with missing school/department data
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEmployee() {
  try {
    // Find the employee by empId
    const empId = '147891'; // Change this to your employee ID
    
    const employee = await prisma.employeeDetails.findFirst({
      where: { empId: empId },
      include: {
        userLogin: true,
        primarySchool: true,
        primaryDepartment: true,
        primaryCentralDept: true
      }
    });
    
    if (!employee) {
      console.log('Employee not found');
      return;
    }
    
    console.log('Current employee data:');
    console.log('- School:', employee.primarySchool?.facultyName || 'Not assigned');
    console.log('- Department:', employee.primaryDepartment?.departmentName || 'Not assigned');
    console.log('- Central Dept:', employee.primaryCentralDept?.departmentName || 'Not assigned');
    
    // Get available schools
    const schools = await prisma.facultySchoolList.findMany({
      where: { isActive: true },
      include: {
        departments: {
          where: { isActive: true }
        }
      }
    });
    
    console.log('\n=== Available Schools ===');
    schools.forEach((school, index) => {
      console.log(`${index + 1}. ${school.facultyName} (ID: ${school.id})`);
      if (school.departments.length > 0) {
        school.departments.forEach((dept, dIndex) => {
          console.log(`   ${dIndex + 1}. ${dept.departmentName} (ID: ${dept.id})`);
        });
      }
    });
    
    console.log('\n=== Instructions ===');
    console.log('To update this employee, modify the script and uncomment the update section below.');
    console.log('Replace SCHOOL_ID and DEPARTMENT_ID with the actual IDs from above.');
    
    // UNCOMMENT AND MODIFY THIS SECTION TO UPDATE THE EMPLOYEE
    /*
    const updated = await prisma.employeeDetails.update({
      where: { id: employee.id },
      data: {
        primarySchoolId: 'SCHOOL_ID', // Replace with actual school ID
        primaryDepartmentId: 'DEPARTMENT_ID', // Replace with actual department ID or null
        // If assigning to central department instead:
        // primaryCentralDeptId: 'CENTRAL_DEPT_ID',
        // primarySchoolId: null,
        // primaryDepartmentId: null,
      }
    });
    
    console.log('\n✅ Employee updated successfully!');
    console.log('New school:', updated.primarySchoolId);
    console.log('New department:', updated.primaryDepartmentId);
    */
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmployee();
