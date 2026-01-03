const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createQuartileEnum() {
  try {
    console.log('Creating quartile_enum type...\n');

    // Check if enum exists
    const enumExists = await prisma.$queryRaw`
      SELECT 1 FROM pg_type WHERE typname = 'quartile_enum'
    `;

    if (enumExists.length > 0) {
      console.log('quartile_enum already exists');
    } else {
      // Create the enum type
      await prisma.$executeRawUnsafe(`
        CREATE TYPE quartile_enum AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');
      `);
      console.log('✓ Created quartile_enum type with values: Q1, Q2, Q3, Q4');
    }

    // Update the column to use the enum type if it's currently VARCHAR
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        -- Check if column exists and is not already an enum
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='research_contribution' 
          AND column_name='quartile'
          AND data_type='character varying'
        ) THEN
          -- Convert to enum type
          ALTER TABLE research_contribution 
          ALTER COLUMN quartile TYPE quartile_enum 
          USING quartile::quartile_enum;
          RAISE NOTICE 'Converted quartile column to enum type';
        END IF;
      END $$;
    `);
    console.log('✓ Updated research_contribution.quartile to use quartile_enum type');

    console.log('\n✓ Quartile enum setup complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createQuartileEnum();
