const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const config = require('../config/app.config');

const seedIprData = async () => {
  try {
    console.log('🌱 Starting IPR system seeding...');

    // Create Central Departments
    const drdDepartment = await prisma.centralDepartment.upsert({
      where: { departmentCode: 'DRD' },
      update: {},
      create: {
        departmentCode: 'DRD',
        departmentName: 'Directorate of Research and Development',
        shortName: 'DRD',
        description: 'Handles research activities, IPR management, and innovation support',
        isActive: true
      }
    });
    console.log('✅ DRD Department created');

    const hrDepartment = await prisma.centralDepartment.upsert({
      where: { departmentCode: 'HR' },
      update: {},
      create: {
        departmentCode: 'HR',
        departmentName: 'Human Resources',
        shortName: 'HR',
        description: 'Manages human resource operations and employee affairs',
        isActive: true
      }
    });
    console.log('✅ HR Department created');

    const financeDepartment = await prisma.centralDepartment.upsert({
      where: { departmentCode: 'FIN' },
      update: {},
      create: {
        departmentCode: 'FIN',
        departmentName: 'Finance Department',
        shortName: 'Finance',
        description: 'Handles financial operations, audit, and incentive processing',
        isActive: true
      }
    });
    console.log('✅ Finance Department created');

    // Create DRD Staff Member
    const drdPassword = await bcrypt.hash('drd123', config.bcrypt.rounds);
    const drdUser = await prisma.userLogin.upsert({
      where: { uid: 'DRD001' },
      update: {},
      create: {
        uid: 'DRD001',
        email: 'drd@sgtuniversity.edu',
        passwordHash: drdPassword,
        role: 'staff',
        status: 'active',
        employeeDetails: {
          create: {
            empId: 'DRD001',
            firstName: 'Titli',
            lastName: 'Researcher',
            displayName: 'Dr. Titli Researcher',
            designation: 'Senior Research Officer',
            primaryCentralDeptId: drdDepartment.id,
            isActive: true
          }
        }
      },
      include: {
        employeeDetails: true
      }
    });
    console.log('✅ DRD Staff (Titli) created (uid: DRD001, password: drd123)');

    // Create Dean user
    const deanPassword = await bcrypt.hash('dean123', config.bcrypt.rounds);
    const deanUser = await prisma.userLogin.upsert({
      where: { uid: 'DEAN001' },
      update: {},
      create: {
        uid: 'DEAN001',
        email: 'dean@sgtuniversity.edu',
        passwordHash: deanPassword,
        role: 'faculty',
        status: 'active',
        employeeDetails: {
          create: {
            empId: 'DEAN001',
            firstName: 'Robert',
            lastName: 'Johnson',
            displayName: 'Prof. Robert Johnson',
            designation: 'Dean of Engineering',
            isActive: true
          }
        }
      }
    });
    console.log('✅ Dean created (uid: DEAN001, password: dean123)');

    // Create Finance Staff
    const financePassword = await bcrypt.hash('finance123', config.bcrypt.rounds);
    const financeUser = await prisma.userLogin.upsert({
      where: { uid: 'FIN001' },
      update: {},
      create: {
        uid: 'FIN001',
        email: 'finance@sgtuniversity.edu',
        passwordHash: financePassword,
        role: 'staff',
        status: 'active',
        employeeDetails: {
          create: {
            empId: 'FIN001',
            firstName: 'Sarah',
            lastName: 'Ahmed',
            displayName: 'Ms. Sarah Ahmed',
            designation: 'Finance Officer',
            primaryCentralDeptId: financeDepartment.id,
            isActive: true
          }
        }
      }
    });
    console.log('✅ Finance Staff created (uid: FIN001, password: finance123)');

    // Create more schools and departments
    const managementFaculty = await prisma.facultySchoolList.upsert({
      where: { facultyCode: 'MGT' },
      update: {},
      create: {
        facultyCode: 'MGT',
        facultyName: 'Faculty of Management',
        facultyType: 'management',
        shortName: 'Management',
        isActive: true
      }
    });

    const mbaDepartment = await prisma.department.upsert({
      where: { departmentCode: 'MBA' },
      update: {},
      create: {
        facultyId: managementFaculty.id,
        departmentCode: 'MBA',
        departmentName: 'Master of Business Administration',
        shortName: 'MBA',
        isActive: true
      }
    });

    // Helper function to generate application number
    const generateApplicationNumber = async (iprType) => {
      const typePrefix = {
        patent: 'PAT',
        copyright: 'CPR',
        trademark: 'TRM',
        design: 'DSN'
      };
      const prefix = typePrefix[iprType] || 'IPR';
      const currentYear = new Date().getFullYear();
      
      const count = await prisma.iprApplication.count({
        where: {
          iprType,
          createdAt: {
            gte: new Date(`${currentYear}-01-01`),
            lt: new Date(`${currentYear + 1}-01-01`)
          }
        }
      });
      
      return `${prefix}-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    };

    // Create some sample IPR applications for testing
    const applicationNumber = await generateApplicationNumber('patent');
    const sampleApplication = await prisma.iprApplication.create({
      data: {
        applicationNumber,
        applicantUserId: drdUser.id,
        applicantType: 'internal_faculty',
        iprType: 'patent',
        projectType: 'faculty_research',
        filingType: 'provisional',
        title: 'AI-Based Smart Campus Management System',
        description: 'An innovative system that uses artificial intelligence to optimize campus resources, manage energy consumption, and enhance student experience through predictive analytics.',
        remarks: 'This technology has significant commercial potential',
        status: 'submitted',
        submittedAt: new Date(),
        applicantDetails: {
          create: {
            employeeCategory: 'teaching',
            employeeType: 'permanent',
            uid: 'DRD001',
            email: 'drd@sgtuniversity.edu',
            phone: '+91-9876543210',
            universityDeptName: 'Directorate of Research and Development'
          }
        },
        sdgs: {
          create: [
            { sdgCode: 'SDG4', sdgTitle: 'Quality Education' },
            { sdgCode: 'SDG9', sdgTitle: 'Industry, Innovation and Infrastructure' }
          ]
        }
      }
    });

    await prisma.iprStatusHistory.create({
      data: {
        iprApplicationId: sampleApplication.id,
        toStatus: 'submitted',
        changedById: drdUser.id,
        comments: 'Application submitted for review'
      }
    });

    console.log('✅ Sample IPR application created');

    console.log('\n🎉 IPR system seeding completed successfully!');
    console.log('\n📝 Additional Test Credentials:');
    console.log('   DRD Staff: DRD001 / drd123');
    console.log('   Dean: DEAN001 / dean123');
    console.log('   Finance: FIN001 / finance123');
    console.log('\n📋 System Features:');
    console.log('   • Central Departments: DRD, HR, Finance');
    console.log('   • Schools: Engineering, Management');
    console.log('   • IPR Sample Application available');

  } catch (error) {
    console.error('❌ IPR seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

seedIprData();