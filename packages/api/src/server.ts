import app from './app';
import { logger } from './utils/logger';
import { config } from './config';
import { prisma } from './models/prisma';

// Validate database connection
async function validateDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to database', error);
    return false;
  }
}

// Start server
async function startServer() {
  try {
    // Check database connection
    const isDbConnected = await validateDatabaseConnection();
    
    if (!isDbConnected) {
      logger.error('❌ Server startup failed due to database connection issues');
      process.exit(1);
    }
    
    const server = app.listen(config.port, () => {
      logger.info(`✅ Server running at http://localhost:${config.port} in ${config.env} mode`);
      logger.info(`🛎️  Health check available at http://localhost:${config.port}/health`);
    });
    
    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${config.port} is already in use. Please stop other services using this port or change the port in configuration.`);
        process.exit(1);
      } else {
        logger.error('❌ Server error:', error);
        process.exit(1);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received. Shutting down gracefully');
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('💤 Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

startServer();