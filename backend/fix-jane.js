const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentorApprovals() {
  try {
    // Get recent IPR applications
    const apps = await prisma.iprApplication.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      take: 5, 
      include: { 
        applicantUser: { select: { uid: true, role: true }}, 
        applicantDetails: { select: { mentorUid: true, mentorName: true }} 
      }
    });
    
    console.log('Recent IPR Applications:');
    apps.forEach(a => {
      console.log({
        id: a.id,
        title: a.title,
        status: a.status,
        applicantUid: a.applicantUser?.uid,
        applicantRole: a.applicantUser?.role,
        mentorUid: a.applicantDetails?.mentorUid,
        mentorName: a.applicantDetails?.mentorName,
        createdAt: a.createdAt
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentorApprovals();
