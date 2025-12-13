require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixJane() {
  try {
    const schools = await prisma.school.findMany({
      select: { schoolId: true, schoolName: true },
      take: 5
    });
    console.log("Available Schools:", JSON.stringify(schools, null, 2));
    
    const departments = await prisma.department.findMany({
      select: { departmentId: true, departmentName: true, schoolId: true },
      take: 10
    });
    console.log("\nAvailable Departments:", JSON.stringify(departments, null, 2));
    
    if (schools.length > 0) {
      const firstSchool = schools[0];
      const schoolDepts = departments.filter(d => d.schoolId === firstSchool.schoolId);
      
      if (schoolDepts.length > 0) {
        console.log(`\nAssigning Jane to: ${firstSchool.schoolName} - ${schoolDepts[0].departmentName}`);
        
        await prisma.employeeDetails.update({
          where: { uid: "FAC987654321" },
          data: {
            primarySchoolId: firstSchool.schoolId,
            primaryDepartmentId: schoolDepts[0].departmentId,
            primaryCentralDeptId: null
          }
        });
        
        console.log("\n Updated Jane successfully!");
        console.log("School:", firstSchool.schoolName);
        console.log("Department:", schoolDepts[0].departmentName);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJane();
