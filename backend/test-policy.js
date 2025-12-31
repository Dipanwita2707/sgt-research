const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPolicy() {
  try {
    console.log('=== Testing Policy Retrieval ===\n');
    
    // 1. List all policies
    const allPolicies = await prisma.researchIncentivePolicy.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${allPolicies.length} total policies:`);
    allPolicies.forEach(p => {
      console.log(`  - ${p.policyName} (${p.publicationType})`);
      console.log(`    Active: ${p.isActive}`);
      console.log(`    Effective: ${p.effectiveFrom?.toISOString()} to ${p.effectiveTo?.toISOString() || 'No end date'}`);
      console.log(`    Has indexingBonuses:`, !!p.indexingBonuses);
      if (p.indexingBonuses) {
        console.log(`    indexingBonuses keys:`, Object.keys(p.indexingBonuses));
        if (p.indexingBonuses.quartileIncentives) {
          console.log(`    Quartile Incentives:`, JSON.stringify(p.indexingBonuses.quartileIncentives, null, 2));
        }
        if (p.indexingBonuses.rolePercentages) {
          console.log(`    Role Percentages:`, JSON.stringify(p.indexingBonuses.rolePercentages, null, 2));
        }
      }
      console.log();
    });
    
    // 2. Test policy retrieval for a specific publication date
    const testPublicationType = 'research_paper';
    const testPublicationDate = new Date('2024-01-01'); // Past date
    const testPublicationDate2 = new Date(); // Current date
    
    console.log('\n=== Test 1: Publication date in past (2024-01-01) ===');
    const policy1 = await prisma.researchIncentivePolicy.findFirst({
      where: {
        publicationType: testPublicationType,
        isActive: true,
        effectiveFrom: { lte: testPublicationDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: testPublicationDate } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    
    if (policy1) {
      console.log(`Found policy: ${policy1.policyName}`);
      console.log(`Effective: ${policy1.effectiveFrom.toISOString()} to ${policy1.effectiveTo?.toISOString() || 'No end date'}`);
    } else {
      console.log('No policy found for this date');
    }
    
    console.log('\n=== Test 2: Publication date today ===');
    const policy2 = await prisma.researchIncentivePolicy.findFirst({
      where: {
        publicationType: testPublicationType,
        isActive: true,
        effectiveFrom: { lte: testPublicationDate2 },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: testPublicationDate2 } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    
    if (policy2) {
      console.log(`Found policy: ${policy2.policyName}`);
      console.log(`Effective: ${policy2.effectiveFrom.toISOString()} to ${policy2.effectiveTo?.toISOString() || 'No end date'}`);
    } else {
      console.log('No policy found for this date');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPolicy();
