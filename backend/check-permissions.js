const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    console.log('=== Checking Users and Permissions ===\n');

    // Get all users
    const users = await prisma.userLogin.findMany({
      select: {
        id: true,
        uid: true,
        email: true,
        role: true,
        employeeDetails: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        centralDeptPermissions: {
          select: {
            id: true,
            permissions: true,
            isActive: true,
            isPrimary: true,
            centralDept: {
              select: {
                departmentName: true,
                departmentCode: true
              }
            }
          }
        },
        schoolDeptPermissions: {
          select: {
            id: true,
            permissions: true,
            isActive: true,
            isPrimary: true,
            department: {
              select: {
                departmentName: true,
                departmentCode: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${users.length} users\n`);

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User: ${user.uid}`);
      console.log(`   Name: ${user.employeeDetails?.firstName} ${user.employeeDetails?.lastName || ''}`);
      console.log(`   Email: ${user.email || user.employeeDetails?.email || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      
      if (user.centralDeptPermissions.length > 0) {
        console.log('   Central Dept Permissions:');
        user.centralDeptPermissions.forEach(perm => {
          console.log(`     - ${perm.centralDept.departmentName} (${perm.centralDept.departmentCode})`);
          console.log(`       Permissions: ${JSON.stringify(perm.permissions)}`);
          console.log(`       Is Active: ${perm.isActive}`);
          console.log(`       Is Primary: ${perm.isPrimary}`);
        });
      } else {
        console.log('   Central Dept Permissions: None');
      }

      if (user.schoolDeptPermissions.length > 0) {
        console.log('   School Dept Permissions:');
        user.schoolDeptPermissions.forEach(perm => {
          console.log(`     - ${perm.department.departmentName} (${perm.department.departmentCode})`);
          console.log(`       Permissions: ${JSON.stringify(perm.permissions)}`);
          console.log(`       Is Active: ${perm.isActive}`);
          console.log(`       Is Primary: ${perm.isPrimary}`);
        });
      } else {
        console.log('   School Dept Permissions: None');
      }
    });

    // Get central departments
    console.log('\n\n=== Central Departments ===\n');
    const centralDepts = await prisma.centralDepartment.findMany({
      select: {
        id: true,
        departmentName: true,
        departmentCode: true,
        isActive: true
      }
    });
    console.log(JSON.stringify(centralDepts, null, 2));

    // Get schools
    console.log('\n\n=== Schools/Departments ===\n');
    const schools = await prisma.department.findMany({
      select: {
        id: true,
        departmentName: true,
        departmentCode: true,
        isActive: true
      },
      take: 10
    });
    console.log(JSON.stringify(schools, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();
