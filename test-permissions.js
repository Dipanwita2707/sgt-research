// Simple script to test and assign permissions to a user
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignTestPermissions() {
  try {
    // Find a faculty member (not admin)
    const faculty = await prisma.userLogin.findFirst({
      where: {
        role: 'faculty',
        uid: { not: 'admin' }
      },
      include: {
        employeeDetails: {
          include: {
            primaryDepartment: true
          }
        }
      }
    });

    if (!faculty) {
      console.log('No faculty found');
      return;
    }

    console.log(`Found faculty: ${faculty.uid} - ${faculty.employeeDetails?.firstName}`);
    console.log(`Department: ${faculty.employeeDetails?.primaryDepartment?.departmentName}`);

    if (faculty.employeeDetails?.primaryDepartmentId) {
      // Assign some test permissions
      const permissions = {
        view_dashboard: true,
        view_students: true,
        file_ipr: true,
        view_own_ipr: true,
        edit_own_ipr: true,
        view_faculty: true,
        view_research: true
      };

      const existingPermission = await prisma.departmentPermission.findFirst({
        where: {
          userId: faculty.id,
          departmentId: faculty.employeeDetails.primaryDepartmentId
        }
      });

      if (existingPermission) {
        await prisma.departmentPermission.update({
          where: { id: existingPermission.id },
          data: { permissions }
        });
        console.log('✅ Permissions updated');
      } else {
        await prisma.departmentPermission.create({
          data: {
            userId: faculty.id,
            departmentId: faculty.employeeDetails.primaryDepartmentId,
            permissions,
            isPrimary: true,
            isActive: true
          }
        });
        console.log('✅ Permissions created');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTestPermissions();