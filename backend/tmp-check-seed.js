const prisma = require('./src/config/database');

(async () => {
  try {
    const user = await prisma.userLogin.findUnique({ where: { uid: 'admin' } });
    console.log(user ? JSON.stringify(user, null, 2) : 'admin not found');

    const faculty = await prisma.userLogin.findUnique({ where: { uid: 'FAC001' } });
    console.log(faculty ? 'FAC001 found' : 'FAC001 not found');

    const student = await prisma.userLogin.findUnique({ where: { uid: 'STU123456789' } });
    console.log(student ? 'STU123456789 found' : 'STU123456789 not found');
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
