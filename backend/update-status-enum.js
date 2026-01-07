require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateStatusValues() {
  try {
    console.log('Updating existing status values to new enum values...');

    // Update research_progress_tracker
    await prisma.$executeRaw`
      UPDATE research_progress_tracker
      SET current_status = 'communicated'
      WHERE current_status IN ('writing', 'submitted', 'under_review')
    `;

    await prisma.$executeRaw`
      UPDATE research_progress_tracker
      SET current_status = 'accepted'
      WHERE current_status IN ('revision_requested', 'revised')
    `;

    console.log('✓ Updated research_progress_tracker table');

    // Update status history
    await prisma.$executeRaw`
      UPDATE research_progress_status_history
      SET from_status = 'communicated'
      WHERE from_status IN ('writing', 'submitted', 'under_review')
    `;

    await prisma.$executeRaw`
      UPDATE research_progress_status_history
      SET to_status = 'communicated'
      WHERE to_status IN ('writing', 'submitted', 'under_review')
    `;

    await prisma.$executeRaw`
      UPDATE research_progress_status_history
      SET from_status = 'accepted'
      WHERE from_status IN ('revision_requested', 'revised')
    `;

    await prisma.$executeRaw`
      UPDATE research_progress_status_history
      SET to_status = 'accepted'
      WHERE to_status IN ('revision_requested', 'revised')
    `;

    console.log('✓ Updated research_progress_status_history table');
    console.log('✓ All status values updated successfully!');
    console.log('\nNow you can run: npx prisma db push');

  } catch (error) {
    console.error('Error updating status values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStatusValues();
