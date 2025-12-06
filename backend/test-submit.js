const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSubmit() {
  try {
    // Find a draft application with mentor
    const app = await prisma.iprApplication.findFirst({ 
      where: { 
        status: 'draft', 
        applicantDetails: { mentorUid: { not: null } }
      }, 
      include: { 
        applicantUser: true, 
        applicantDetails: true 
      }
    });
    
    if (!app) {
      console.log('No draft application with mentor found');
      return;
    }
    
    console.log('Found application:', {
      id: app.id,
      title: app.title,
      status: app.status,
      applicantUserId: app.applicantUserId,
      applicantUid: app.applicantUser?.uid,
      applicantRole: app.applicantUser?.role,
      mentorUid: app.applicantDetails?.mentorUid
    });
    
    // Try to submit it manually
    const isStudent = app.applicantUser?.role === 'student';
    const hasMentor = app.applicantDetails?.mentorUid && app.applicantDetails.mentorUid.trim() !== '';
    
    console.log('Is student:', isStudent);
    console.log('Has mentor:', hasMentor);
    
    const newStatus = (isStudent && hasMentor) ? 'pending_mentor_approval' : 'submitted';
    console.log('New status should be:', newStatus);
    
    // Update the application
    const updated = await prisma.iprApplication.update({
      where: { id: app.id },
      data: {
        status: newStatus,
        submittedAt: new Date()
      }
    });
    
    console.log('Updated successfully:', {
      id: updated.id,
      status: updated.status,
      submittedAt: updated.submittedAt
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubmit();
