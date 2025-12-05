/**
 * Script to create the DRD (Development & Research Department) central department
 * Run with: node create-drd-department.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDrdDepartment() {
  try {
    console.log('Checking for existing DRD department...');
    
    // Check if DRD already exists
    const existing = await prisma.centralDepartment.findFirst({
      where: { departmentCode: 'DRD' }
    });
    
    if (existing) {
      console.log('✅ DRD department already exists:', existing);
      return existing;
    }
    
    console.log('Creating DRD department...');
    
    const drdDept = await prisma.centralDepartment.create({
      data: {
        departmentCode: 'DRD',
        departmentName: 'Development & Research Department',
        shortName: 'DRD',
        description: 'Handles IPR applications, research grants, and innovation management',
        departmentType: 'administrative',
        isActive: true,
      }
    });
    
    console.log('✅ DRD department created successfully:', drdDept);
    
    // Also create Finance department if it doesn't exist
    const financeExisting = await prisma.centralDepartment.findFirst({
      where: { departmentCode: 'FIN' }
    });
    
    if (!financeExisting) {
      console.log('Creating Finance department...');
      const financeDept = await prisma.centralDepartment.create({
        data: {
          departmentCode: 'FIN',
          departmentName: 'Finance Department',
          shortName: 'Finance',
          description: 'Handles financial operations, incentives, and auditing',
          departmentType: 'administrative',
          isActive: true,
        }
      });
      console.log('✅ Finance department created:', financeDept);
    } else {
      console.log('✅ Finance department already exists');
    }
    
    // List all central departments
    const allDepts = await prisma.centralDepartment.findMany({
      orderBy: { departmentCode: 'asc' }
    });
    
    console.log('\n📋 All Central Departments:');
    allDepts.forEach(dept => {
      console.log(`  - ${dept.departmentCode}: ${dept.departmentName} (${dept.isActive ? 'Active' : 'Inactive'})`);
    });
    
    return drdDept;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createDrdDepartment()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
