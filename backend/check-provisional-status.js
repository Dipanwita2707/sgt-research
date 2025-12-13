const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const apps = await prisma.iprApplication.findMany({
      where: {
        filingType: 'provisional'
      },
      select: {
        id: true,
        applicationNumber: true,
        title: true,
        status: true,
        filingType: true,
        completedAt: true,
        convertedApplications: {
          select: {
            id: true,
            applicationNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Provisional Applications:');
    console.log(JSON.stringify(apps, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
