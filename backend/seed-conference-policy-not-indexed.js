const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting conference policy seeding for paper_not_indexed...');

    // Get an admin user to set as creator
    const adminUser = await prisma.userLogin.findFirst({
      where: {
        OR: [
          { role: 'superadmin' },
          { role: 'admin' }
        ]
      }
    });

    if (!adminUser) {
      throw new Error('No admin user found. Please create an admin user first.');
    }

    console.log('Using admin user:', adminUser.email);

    // Check if policy already exists
    const existingPolicy = await prisma.conferenceIncentivePolicy.findFirst({
      where: {
        conferenceSubType: 'paper_not_indexed',
        isActive: true
      }
    });

    if (existingPolicy) {
      console.log('Policy already exists:', existingPolicy.policyName);
      return;
    }

    // Create the policy for paper_not_indexed conferences
    const policy = await prisma.conferenceIncentivePolicy.create({
      data: {
        policyName: 'Conference Paper (Not Indexed) - Default Policy',
        conferenceSubType: 'paper_not_indexed',
        flatIncentiveAmount: 15000, // ₹15,000 flat amount
        flatPoints: 15, // 15 points flat
        splitPolicy: 'equal', // Equal distribution among all authors
        internationalBonus: 5000, // ₹5,000 bonus for international
        bestPaperAwardBonus: 5000, // ₹5,000 bonus for best paper award
        isActive: true,
        effectiveFrom: new Date('2024-01-01'), // Effective from past to cover all submissions
        effectiveTo: null, // No end date (active indefinitely)
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    });

    console.log('✅ Conference policy created successfully:');
    console.log(JSON.stringify(policy, null, 2));

    // Create policy for keynote_speaker_invited_talks
    const keynotePolicy = await prisma.conferenceIncentivePolicy.create({
      data: {
        policyName: 'Conference Keynote/Invited Speaker - Default Policy',
        conferenceSubType: 'keynote_speaker_invited_talks',
        flatIncentiveAmount: 20000, // ₹20,000 flat amount
        flatPoints: 20, // 20 points flat
        splitPolicy: 'equal',
        internationalBonus: 5000,
        bestPaperAwardBonus: 0, // No best paper award bonus for keynote
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    });

    console.log('✅ Keynote conference policy created successfully:');
    console.log(JSON.stringify(keynotePolicy, null, 2));

    // Create policy for organizer_coordinator_member
    const organizerPolicy = await prisma.conferenceIncentivePolicy.create({
      data: {
        policyName: 'Conference Organizer/Coordinator - Default Policy',
        conferenceSubType: 'organizer_coordinator_member',
        flatIncentiveAmount: 10000, // ₹10,000 flat amount
        flatPoints: 10, // 10 points flat
        splitPolicy: 'equal',
        internationalBonus: 5000,
        bestPaperAwardBonus: 0, // No best paper award bonus for organizer
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    });

    console.log('✅ Organizer conference policy created successfully:');
    console.log(JSON.stringify(organizerPolicy, null, 2));

  } catch (error) {
    console.error('Error seeding conference policies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
