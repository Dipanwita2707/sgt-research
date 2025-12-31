const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPolicyDates() {
  try {
    console.log('=== Fixing Policy Effective Dates ===\n');
    
    // Get all active policies
    const policies = await prisma.researchIncentivePolicy.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${policies.length} active policies\n`);
    
    for (const policy of policies) {
      console.log(`Policy: ${policy.policyName}`);
      console.log(`  Current effectiveFrom: ${policy.effectiveFrom.toISOString()}`);
      console.log(`  Current effectiveTo: ${policy.effectiveTo?.toISOString() || 'No end date'}`);
      
      // Set effectiveFrom to a date in the past (e.g., Jan 1, 2020)
      // This ensures the policy applies to all research papers regardless of publication date
      const newEffectiveFrom = new Date('2020-01-01');
      
      await prisma.researchIncentivePolicy.update({
        where: { id: policy.id },
        data: {
          effectiveFrom: newEffectiveFrom
        }
      });
      
      console.log(`  ✅ Updated effectiveFrom to: ${newEffectiveFrom.toISOString()}`);
      console.log();
    }
    
    console.log('✅ All policies updated successfully!');
    console.log('\nNow all research papers (past, present, and future) will use the saved policy values.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPolicyDates();
