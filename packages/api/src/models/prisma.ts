import { PrismaClient } from '@prisma/client';

// Create Prisma client instance with logging in development
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Export Prisma client types
export * from '@prisma/client';

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});