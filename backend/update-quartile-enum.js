const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateQuartileEnum() {
  try {
    console.log('Updating quartile_enum to include Top 1%, Top 5%, Top 10%...\n');

    // Add new values to the enum
    const newValues = ['Top 1%', 'Top 5%', 'Top 10%'];
    
    for (const value of newValues) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TYPE quartile_enum ADD VALUE IF NOT EXISTS '${value}';
        `);
        console.log(`✓ Added '${value}' to quartile_enum`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`  '${value}' already exists in quartile_enum`);
        } else {
          console.log(`  Error adding '${value}':`, e.message);
        }
      }
    }

    console.log('\n✓ Quartile enum update complete!');
    console.log('\nAvailable quartile values:');
    console.log('  - Top 1% (same incentive as Q1)');
    console.log('  - Top 5% (same incentive as Q1)');
    console.log('  - Top 10% (same incentive as Q1)');
    console.log('  - Q1');
    console.log('  - Q2');
    console.log('  - Q3');
    console.log('  - Q4');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateQuartileEnum();
