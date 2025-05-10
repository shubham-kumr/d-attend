// Debug script for API server
import { logger } from './src/utils/logger';

// Set NODE_ENV to development
// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// Enable detailed error logging
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught exception:');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  // Don't exit immediately to see the full error
  setTimeout(() => {
    process.exit(1);
  }, 3000);
});

process.on('unhandledRejection', (err: any) => {
  logger.error('❌ Unhandled rejection:');
  console.error('Error name:', err?.name);
  console.error('Error message:', err?.message);
  console.error('Error stack:', err?.stack);
  // Don't exit immediately to see the full error
  setTimeout(() => {
    process.exit(1);
  }, 3000);
});

// Import the app with debug wrapper
try {
  console.log('Starting API server in debug mode...');
  import('./src/app');
} catch (error) {
  console.error('Failed to import app:', error);
}