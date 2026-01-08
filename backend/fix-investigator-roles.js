const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInvestigatorRoles() {
  try {
    console.log('Starting to fix investigator roles...');

    // Find all investigators with invalid roleType
    const investigators = await prisma.grantInvestigator.findMany({
      select: {
        id: true,
        name: true,
        roleType: true,
        grantApplicationId: true
      }
    });

    console.log(`Found ${investigators.length} investigators`);

    // Fix any with invalid roleType (anything other than 'pi' or 'co_pi')
    let fixedCount = 0;
    for (const inv of investigators) {
      if (!['pi', 'co_pi'].includes(inv.roleType)) {
        console.log(`Fixing investigator ${inv.name} with invalid roleType: ${inv.roleType}`);
        await prisma.grantInvestigator.update({
          where: { id: inv.id },
          data: { roleType: 'co_pi' }
        });
        fixedCount++;
      }
    }

    console.log(`Fixed ${fixedCount} investigators with invalid roleType`);

    // Show current distribution
    const piCount = await prisma.grantInvestigator.count({
      where: { roleType: 'pi' }
    });
    const copiCount = await prisma.grantInvestigator.count({
      where: { roleType: 'co_pi' }
    });

    console.log(`\nCurrent distribution:`);
    console.log(`PIs: ${piCount}`);
    console.log(`Co-PIs: ${copiCount}`);

  } catch (error) {
    console.error('Error fixing investigator roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInvestigatorRoles();
