const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const config = require('../config/app.config');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', config.bcrypt.rounds);
    const admin = await prisma.userLogin.upsert({
      where: { uid: 'admin' },
      update: {},
      create: {
        uid: 'admin',
        email: 'admin@sgtuniversity.edu',
        passwordHash: adminPassword,
        role: 'admin',
        status: 'active'
      }
    });
    console.log('✅ Admin created (uid: admin, password: admin123)');

    // Create test faculty member
    const facultyPassword = await bcrypt.hash('faculty123', config.bcrypt.rounds);
    const faculty = await prisma.userLogin.upsert({
      where: { uid: 'FAC001' },
      update: {},
      create: {
        uid: 'FAC001',
        email: 'faculty@sgtuniversity.edu',
        passwordHash: facultyPassword,
        role: 'faculty',
        status: 'active',
        employeeDetails: {
          create: {
            firstName: 'John',
            lastName: 'Doe',
            empId: 'EMP001',
            designation: 'Assistant Professor',
            isActive: true
          }
        }
      }
    });
    console.log('✅ Faculty created (uid: FAC001, password: faculty123)');

    // Create test staff member
    const staffPassword = await bcrypt.hash('staff123', config.bcrypt.rounds);
    const staff = await prisma.userLogin.upsert({
      where: { uid: 'STF001' },
      update: {},
      create: {
        uid: 'STF001',
        email: 'staff@sgtuniversity.edu',
        passwordHash: staffPassword,
        role: 'staff',
        status: 'active',
        employeeDetails: {
          create: {
            firstName: 'Jane',
            lastName: 'Smith',
            empId: 'EMP002',
            designation: 'Administrative Officer',
            isActive: true
          }
        }
      }
    });
    console.log('✅ Staff created (uid: STF001, password: staff123)');

    // Create faculty
    const engineeringFaculty = await prisma.facultySchoolList.upsert({
      where: { facultyCode: 'ENG' },
      update: {},
      create: {
        facultyCode: 'ENG',
        facultyName: 'Faculty of Engineering',
        facultyType: 'engineering',
        shortName: 'Engineering',
        isActive: true,
        headOfFacultyId: faculty.id
      }
    });
    console.log('✅ Engineering Faculty created');

    // Create department
    const csDepartment = await prisma.department.upsert({
      where: { departmentCode: 'CSE' },
      update: {},
      create: {
        facultyId: engineeringFaculty.id,
        departmentCode: 'CSE',
        departmentName: 'Computer Science & Engineering',
        shortName: 'CSE',
        isActive: true,
        headOfDepartmentId: faculty.id
      }
    });
    console.log('✅ CSE Department created');

    // Create program
    const btechProgram = await prisma.program.upsert({
      where: { programCode: 'BTECH-CSE' },
      update: {},
      create: {
        departmentId: csDepartment.id,
        programCode: 'BTECH-CSE',
        programName: 'Bachelor of Technology in Computer Science',
        programType: 'undergraduate',
        shortName: 'B.Tech CSE',
        durationYears: 4,
        durationSemesters: 8,
        admissionCapacity: 120,
        isActive: true,
        programCoordinatorId: faculty.id
      }
    });
    console.log('✅ B.Tech CSE Program created');

    // Create section
    const section = await prisma.section.upsert({
      where: {
        programId_sectionCode_academicYear_semester: {
          programId: btechProgram.id,
          sectionCode: 'A',
          academicYear: '2024-25',
          semester: 1
        }
      },
      update: {},
      create: {
        programId: btechProgram.id,
        sectionCode: 'A',
        sectionName: 'Section A',
        academicYear: '2024-25',
        semester: 1,
        batchYear: 2024,
        capacity: 60,
        classTeacherId: faculty.id,
        status: 'active'
      }
    });
    console.log('✅ Section A created');

    // Create test student
    const studentPassword = await bcrypt.hash('student123', config.bcrypt.rounds);
    const studentUser = await prisma.userLogin.upsert({
      where: { uid: 'STU123456789' },
      update: {},
      create: {
        uid: 'STU123456789',
        email: 'student@sgtuniversity.edu',
        passwordHash: studentPassword,
        role: 'student',
        status: 'active'
      }
    });

    const student = await prisma.studentDetails.upsert({
      where: { studentId: '2024001' },
      update: {},
      create: {
        userLoginId: studentUser.id,
        studentId: '2024001',
        registrationNo: '123456789',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'student@sgtuniversity.edu',
        sectionId: section.id,
        programId: btechProgram.id,
        currentSemester: 1,
        isActive: true,
        dataEntryStatus: 'approved'
      }
    });
    console.log('✅ Student created (uid: STU123456789, password: student123)');

    // Grant department permissions
    await prisma.userDepartmentPermission.upsert({
      where: {
        userId_department: {
          userId: faculty.id,
          department: 'REGISTRAR'
        }
      },
      update: {},
      create: {
        userId: faculty.id,
        department: 'REGISTRAR',
        permissions: {
          viewStudents: true,
          editStudents: false,
          approveData: true
        },
        isActive: true,
        assignedBy: admin.id
      }
    });
    console.log('✅ Permissions granted to faculty');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Faculty: FAC001 / faculty123');
    console.log('   Staff: STF001 / staff123');
    console.log('   Student: STU123456789 / student123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

seedDatabase();
