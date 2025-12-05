require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function fixEnumMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('Connected to database via Prisma');

    // Step 1: Check current data using old enum values
    console.log('\n📊 Checking current data with old enum values...');
    
    const oldStatusCheck = await prisma.$queryRaw`
      SELECT status::text, COUNT(*)::int as count 
      FROM ipr_application 
      WHERE status::text IN ('drd_approved', 'under_dean_review', 'dean_approved', 'dean_rejected')
      GROUP BY status
    `;
    
    if (oldStatusCheck.length > 0) {
      console.log('Found applications with old statuses:');
      oldStatusCheck.forEach(row => {
        console.log(`  - ${row.status}: ${row.count} records`);
      });
    } else {
      console.log('No applications found with old enum values');
    }

    // Step 2: Update ipr_application statuses
    console.log('\n🔄 Updating ipr_application statuses...');
    
    // Map old statuses to new ones using raw SQL
    await prisma.$executeRaw`
      UPDATE ipr_application SET status = 'submitted' 
      WHERE status::text = 'drd_approved'
    `;
    console.log('  Updated drd_approved -> submitted');
    
    await prisma.$executeRaw`
      UPDATE ipr_application SET status = 'submitted' 
      WHERE status::text = 'under_dean_review'
    `;
    console.log('  Updated under_dean_review -> submitted');
    
    await prisma.$executeRaw`
      UPDATE ipr_application SET status = 'submitted' 
      WHERE status::text = 'dean_approved'
    `;
    console.log('  Updated dean_approved -> submitted');
    
    await prisma.$executeRaw`
      UPDATE ipr_application SET status = 'draft' 
      WHERE status::text = 'dean_rejected'
    `;
    console.log('  Updated dean_rejected -> draft');

    // Step 3: Update ipr_status_history
    console.log('\n🔄 Updating ipr_status_history...');
    
    await prisma.$executeRaw`
      UPDATE ipr_status_history SET from_status = 'submitted' 
      WHERE from_status::text IN ('drd_approved', 'under_dean_review', 'dean_approved')
    `;
    
    await prisma.$executeRaw`
      UPDATE ipr_status_history SET from_status = 'draft' 
      WHERE from_status::text = 'dean_rejected'
    `;
    
    await prisma.$executeRaw`
      UPDATE ipr_status_history SET to_status = 'submitted' 
      WHERE to_status::text IN ('drd_approved', 'under_dean_review', 'dean_approved')
    `;
    
    await prisma.$executeRaw`
      UPDATE ipr_status_history SET to_status = 'draft' 
      WHERE to_status::text = 'dean_rejected'
    `;
    
    console.log('  ✅ Status history updated');

    // Step 4: Add the assigned_school_ids column if it doesn't exist
    console.log('\n🔄 Adding assigned_school_ids column...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE central_department_permission 
        ADD COLUMN IF NOT EXISTS assigned_school_ids JSONB NOT NULL DEFAULT '[]'
      `;
      console.log('  ✅ assigned_school_ids column added/verified');
    } catch (colError) {
      console.log('  Column may already exist:', colError.message);
    }

    // Step 5: Add revision_count column if it doesn't exist
    console.log('\n🔄 Adding revision_count column...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE ipr_application 
        ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0
      `;
      console.log('  ✅ revision_count column added/verified');
    } catch (colError) {
      console.log('  Column may already exist:', colError.message);
    }

    // Step 6: Verify no old values remain
    console.log('\n✅ Verification...');
    
    const verifyApp = await prisma.$queryRaw`
      SELECT status::text, COUNT(*)::int as count 
      FROM ipr_application 
      WHERE status::text IN ('drd_approved', 'under_dean_review', 'dean_approved', 'dean_rejected')
      GROUP BY status
    `;
    
    if (verifyApp.length === 0) {
      console.log('  ✅ No old enum values remain in ipr_application');
    } else {
      console.log('  ⚠️ Warning: Old values still exist in ipr_application');
      verifyApp.forEach(row => console.log(`    - ${row.status}: ${row.count}`));
    }

    console.log('\n🎉 Data migration completed!');
    console.log('\nNow you can run: npx prisma db push');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('\nDatabase connection closed');
  }
}

fixEnumMigration();
