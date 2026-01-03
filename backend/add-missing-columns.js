const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to database...\n');

    // Add quartile column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_contribution' AND column_name='quartile') THEN
                ALTER TABLE research_contribution ADD COLUMN quartile VARCHAR(16);
            END IF;
        END $$;
      `);
      console.log('✓ Added research_contribution.quartile');
    } catch (e) {
      console.log('  research_contribution.quartile already exists or error:', e.message);
    }

    // Add sdg_goals column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_contribution' AND column_name='sdg_goals') THEN
                ALTER TABLE research_contribution ADD COLUMN sdg_goals TEXT[];
            END IF;
        END $$;
      `);
      console.log('✓ Added research_contribution.sdg_goals');
    } catch (e) {
      console.log('  research_contribution.sdg_goals already exists or error:', e.message);
    }

    // Add first_author_percentage column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_incentive_policy' AND column_name='first_author_percentage') THEN
                ALTER TABLE research_incentive_policy ADD COLUMN first_author_percentage DECIMAL(5,2) DEFAULT 40;
            END IF;
        END $$;
      `);
      console.log('✓ Added research_incentive_policy.first_author_percentage');
    } catch (e) {
      console.log('  research_incentive_policy.first_author_percentage already exists or error:', e.message);
    }

    // Add corresponding_author_percentage column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_incentive_policy' AND column_name='corresponding_author_percentage') THEN
                ALTER TABLE research_incentive_policy ADD COLUMN corresponding_author_percentage DECIMAL(5,2) DEFAULT 30;
            END IF;
        END $$;
      `);
      console.log('✓ Added research_incentive_policy.corresponding_author_percentage');
    } catch (e) {
      console.log('  research_incentive_policy.corresponding_author_percentage already exists or error:', e.message);
    }

    console.log('\n✓ Column addition complete!');
    
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();
