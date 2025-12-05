// Simple script to test and assign permissions to a user
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignTestPermissions() {
  try {
    console.log('🔍 Looking for faculty members...');
    
    // Find all faculty members (not admin)
    const faculties = await prisma.userLogin.findMany({
      where: {
        role: 'faculty'
      },
      include: {
        employeeDetails: {
          include: {
            primaryDepartment: true
          }
        }
      }
    });

    console.log(`Found ${faculties.length} faculty members`);

    for (const faculty of faculties) {
      console.log(`\n👤 Faculty: ${faculty.uid} - ${faculty.employeeDetails?.firstName || 'No Name'}`);
      console.log(`📧 Email: ${faculty.email}`);
      console.log(`🏢 Department: ${faculty.employeeDetails?.primaryDepartment?.departmentName || 'No Department'}`);

      if (faculty.employeeDetails?.primaryDepartmentId) {
        // Assign comprehensive permissions
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
        
        console.log(`📋 Assigned ${Object.keys(permissions).length} permissions`);
      } else {
        console.log('❌ No department assigned');
      }
    }

    console.log('\n✨ All done!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTestPermissions();