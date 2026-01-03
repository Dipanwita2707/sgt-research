const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateQuartileEnum() {
  try {
    console.log('Updating quartile system...\n');

    // Note: PostgreSQL doesn't support removing enum values directly
    // We need to create a new enum and migrate the data
    
    console.log('Step 1: Creating new enum type with updated values...');
    await prisma.$executeRawUnsafe(`
      CREATE TYPE quartile_enum_new AS ENUM ('Top 1%', 'Top 5%', 'Q1', 'Q2', 'Q3', 'Q4');
    `);
    console.log('✓ Created quartile_enum_new');

    console.log('\nStep 2: Updating research_contribution table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE research_contribution 
      ALTER COLUMN quartile TYPE quartile_enum_new 
      USING (
        CASE 
          WHEN quartile::text = 'Top 10%' THEN NULL::quartile_enum_new
          ELSE quartile::text::quartile_enum_new
        END
      );
    `);
    console.log('✓ Updated research_contribution.quartile column (Top 10% values set to NULL)');

    console.log('\nStep 3: Dropping old enum and renaming new one...');
    await prisma.$executeRawUnsafe(`
      DROP TYPE quartile_enum;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TYPE quartile_enum_new RENAME TO quartile_enum;
    `);
    console.log('✓ Replaced old enum with new enum');

    console.log('\n✓ Quartile enum update complete!');
    console.log('\nAvailable quartile values:');
    console.log('  - Top 1% (separate incentive)');
    console.log('  - Top 5% (separate incentive)');
    console.log('  - Q1');
    console.log('  - Q2');
    console.log('  - Q3');
    console.log('  - Q4');
    console.log('\nRemoved:');
    console.log('  - Top 10% (no longer used)');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateQuartileEnum();
