const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testContribution() {
  try {
    console.log('=== Testing Contribution with Different Publication Dates ===\n');
    
    // Get a sample contribution
    const contribution = await prisma.researchContribution.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (contribution) {
      console.log(`Found contribution: ${contribution.title}`);
      console.log(`Publication Date: ${contribution.publicationDate?.toISOString() || 'Not set'}`);
      console.log(`Quartile: ${contribution.quartile || 'Not set'}`);
      console.log(`SJR: ${contribution.sjr || 'Not set'}`);
      console.log();
      
      // Test policy retrieval for this publication date
      const publicationType = contribution.publicationType || 'research_paper';
      const publicationDate = contribution.publicationDate || new Date();
      
      console.log(`Querying policy for:`);
      console.log(`  Publication Type: ${publicationType}`);
      console.log(`  Publication Date: ${publicationDate.toISOString()}`);
      console.log();
      
      const policy = await prisma.researchIncentivePolicy.findFirst({
        where: {
          publicationType: publicationType,
          isActive: true,
          effectiveFrom: { lte: publicationDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: publicationDate } }
          ]
        },
        orderBy: { effectiveFrom: 'desc' }
      });
      
      if (policy) {
        console.log('✅ POLICY FOUND:');
        console.log(`   Name: ${policy.policyName}`);
        console.log(`   Effective From: ${policy.effectiveFrom.toISOString()}`);
        console.log(`   Effective To: ${policy.effectiveTo?.toISOString() || 'No end date'}`);
        console.log();
        console.log(`   Quartile Incentives from policy:`);
        if (policy.indexingBonuses?.quartileIncentives) {
          policy.indexingBonuses.quartileIncentives.forEach(q => {
            console.log(`     ${q.quartile}: ₹${q.incentiveAmount}, ${q.points} points`);
          });
        }
      } else {
        console.log('❌ NO POLICY FOUND - Will use hard-coded defaults:');
        console.log('   Q1: ₹50,000, 50 points');
        console.log('   Q2: ₹30,000, 30 points');
        console.log('   Q3: ₹15,000, 15 points');
        console.log('   Q4: ₹5,000, 5 points');
      }
      
    } else {
      console.log('No contributions found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testContribution();
