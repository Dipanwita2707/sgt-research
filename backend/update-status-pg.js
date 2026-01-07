require('dotenv').config();
const { Client } = require('pg');

async function updateStatusValues() {
  const connectionString = process.env.DATABASE_URL.replace(/^"|"$/g, '');
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    console.log('Updating existing status values to new enum values...\n');

    // Check current status values
    const checkResult = await client.query(`
      SELECT current_status, COUNT(*) as count
      FROM research_progress_tracker
      GROUP BY current_status
      ORDER BY count DESC
    `);
    
    console.log('Current status distribution:');
    checkResult.rows.forEach(row => {
      console.log(`  ${row.current_status}: ${row.count} records`);
    });
    console.log('');

    // Step 1: Add new enum values
    console.log('Step 1: Adding new enum value "communicated"...');
    await client.query(`
      ALTER TYPE research_tracker_status_enum ADD VALUE IF NOT EXISTS 'communicated'
    `);
    console.log('✓ Added "communicated" to enum');

    // Step 2: Update research_progress_tracker
    console.log('\nStep 2: Updating records...');
    const result1 = await client.query(`
      UPDATE research_progress_tracker
      SET current_status = 'communicated'
      WHERE current_status IN ('writing', 'submitted', 'under_review')
    `);
    console.log(`✓ Updated ${result1.rowCount} records from writing/submitted/under_review -> communicated`);

    const result2 = await client.query(`
      UPDATE research_progress_tracker
      SET current_status = 'accepted'
      WHERE current_status IN ('revision_requested', 'revised')
    `);
    console.log(`✓ Updated ${result2.rowCount} records from revision_requested/revised -> accepted`);

    // Update status history
    await client.query(`
      UPDATE research_progress_status_history
      SET from_status = 'communicated'
      WHERE from_status IN ('writing', 'submitted', 'under_review')
    `);

    await client.query(`
      UPDATE research_progress_status_history
      SET to_status = 'communicated'
      WHERE to_status IN ('writing', 'submitted', 'under_review')
    `);

    await client.query(`
      UPDATE research_progress_status_history
      SET from_status = 'accepted'
      WHERE from_status IN ('revision_requested', 'revised')
    `);

    await client.query(`
      UPDATE research_progress_status_history
      SET to_status = 'accepted'
      WHERE to_status IN ('revision_requested', 'revised')
    `);

    console.log('✓ Updated research_progress_status_history table');
    console.log('\n✅ All status values updated successfully!');
    console.log('\nNow you can run: npx prisma db push');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

updateStatusValues();
