// Script to fix faculty department assignment
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixFacultyDepartment() {
  try {
    console.log('🔧 Fixing faculty department assignment...');
    
    // Get the faculty and department
    const faculty = await prisma.userLogin.findFirst({
      where: { uid: 'FAC001' },
      include: { employeeDetails: true }
    });

    const department = await prisma.department.findFirst({
      where: { departmentCode: 'CSE' }
    });

    if (faculty && department && faculty.employeeDetails) {
      await prisma.employeeDetails.update({
        where: { id: faculty.employeeDetails.id },
        data: {
          primaryDepartmentId: department.id
        }
      });
      console.log('✅ Faculty assigned to CSE department');
      
      // Also assign default permissions
      const permissions = {
        // General permissions
        view_dashboard: true,
        view_reports: true,
        export_data: true,
        
        // Student permissions (faculty can view/manage students)
        view_students: true,
        view_student_records: true,
        
        // IPR permissions
        file_ipr: true,
        view_own_ipr: true,
        edit_own_ipr: true,
        
        // Faculty permissions
        view_faculty: true,
        
        // Research permissions
        view_research: true,
        add_research: true,
        edit_research: true,
        
        // Course permissions
        view_courses: true,
        assign_courses: true,
        
        // Examination permissions
        view_exams: true,
        enter_marks: true
      };

      const existingPermission = await prisma.departmentPermission.findFirst({
        where: {
          userId: faculty.id,
          departmentId: department.id
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
            departmentId: department.id,
            permissions,
            isPrimary: true,
            isActive: true
          }
        });
        console.log('✅ Permissions created');
      }
      
      console.log(`📋 Assigned ${Object.keys(permissions).length} permissions to faculty`);
    } else {
      console.log('❌ Faculty or department not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFacultyDepartment();