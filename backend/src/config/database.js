const { PrismaClient } = require('@prisma/client');

// Optimized Prisma configuration for 25,000 concurrent users
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'], // Reduced logging for performance
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool configuration for high concurrency
  // Note: Actual pool managed by PostgreSQL connection string params
  transactionOptions: {
    maxWait: 20000, // 20 seconds max wait to acquire a transaction slot
    timeout: 30000, // 30 seconds transaction timeout (increased for slow connections)
    isolationLevel: 'ReadCommitted', // Default isolation level
  },
});

prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully via Prisma');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// Handle cleanup on application termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
