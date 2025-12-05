require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.userLogin.findMany({
      select: { uid: true, role: true, email: true }
    });
    
    console.log('Available users:');
    users.forEach(u => console.log(`UID: ${u.uid}, Role: ${u.role}, Email: ${u.email}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();