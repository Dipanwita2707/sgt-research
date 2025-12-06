const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFiles() {
  try {
    const apps = await prisma.iprApplication.findMany({
      where: { annexureFilePath: { not: null }},
      select: { id: true, title: true, annexureFilePath: true, supportingDocsFilePaths: true }
    });
    console.log('Applications with annexures:', apps);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFiles();
