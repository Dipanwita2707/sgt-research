const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignDefaultPermissions() {
  try {
    console.log('=== Assigning Default Permissions ===\n');

    // Get the CSE department
    const cseDept = await prisma.department.findFirst({
      where: { departmentCode: 'CSE' }
    });

    if (!cseDept) {
      console.log('CSE department not found!');
      return;
    }

    // Get the faculty user
    const faculty = await prisma.userLogin.findUnique({
      where: { uid: 'FAC001' },
      include: { schoolDeptPermissions: true }
    });

    if (faculty) {
      console.log('Found faculty user:', faculty.uid);
      
      // Check if already has permissions
      if (faculty.schoolDeptPermissions.length === 0) {
        const facultyPerms = await prisma.departmentPermission.create({
          data: {
            userId: faculty.id,
            departmentId: cseDept.id,
            isPrimary: true,
            isActive: true,
            permissions: {
              // Faculty permissions
              view_dashboard: true,
              view_students: true,
              view_faculty: true,
              view_courses: true,
              manage_syllabus: true,
              enter_marks: true,
              view_research: true,
              add_research: true,
              ipr_file_new: true,
              ipr_view: true,
              research_submit: true,
              research_view: true
            }
          }
        });
        console.log('✓ Assigned faculty permissions to department:', cseDept.departmentName);
      } else {
        console.log('Faculty already has permissions');
      }
    }

    // Get the staff user
    const staff = await prisma.userLogin.findUnique({
      where: { uid: 'STF001' },
      include: { schoolDeptPermissions: true }
    });

    if (staff) {
      console.log('Found staff user:', staff.uid);
      
      // Check if already has permissions
      if (staff.schoolDeptPermissions.length === 0) {
        const staffPerms = await prisma.departmentPermission.create({
          data: {
            userId: staff.id,
            departmentId: cseDept.id,
            isPrimary: true,
            isActive: true,
            permissions: {
              // Staff permissions
              view_dashboard: true,
              view_students: true,
              view_faculty: true,
              view_courses: true,
              view_exams: true,
              view_research: true
            }
          }
        });
        console.log('✓ Assigned staff permissions to department:', cseDept.departmentName);
      } else {
        console.log('Staff already has permissions');
      }
    }

    // Get the student user
    const student = await prisma.userLogin.findUnique({
      where: { uid: 'STU123456789' }
    });

    if (student) {
      console.log('Found student user:', student.uid);
      // Students typically don't need department permissions, they have default access
      // But if needed, you can add them here
      console.log('Students have default access based on their role');
    }

    console.log('\n=== Verification ===\n');
    
    // Verify the assignments
    const updatedFaculty = await prisma.userLogin.findUnique({
      where: { uid: 'FAC001' },
      include: {
        schoolDeptPermissions: {
          include: {
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

    if (updatedFaculty && updatedFaculty.schoolDeptPermissions.length > 0) {
      console.log('Faculty permissions:');
      updatedFaculty.schoolDeptPermissions.forEach(perm => {
        console.log(`  - ${perm.department.departmentName}`);
        console.log(`    Permissions: ${Object.keys(perm.permissions).filter(k => perm.permissions[k]).join(', ')}`);
      });
    }

    const updatedStaff = await prisma.userLogin.findUnique({
      where: { uid: 'STF001' },
      include: {
        schoolDeptPermissions: {
          include: {
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

    if (updatedStaff && updatedStaff.schoolDeptPermissions.length > 0) {
      console.log('\nStaff permissions:');
      updatedStaff.schoolDeptPermissions.forEach(perm => {
        console.log(`  - ${perm.department.departmentName}`);
        console.log(`    Permissions: ${Object.keys(perm.permissions).filter(k => perm.permissions[k]).join(', ')}`);
      });
    }

    console.log('\n✓ Permissions assignment complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignDefaultPermissions();
