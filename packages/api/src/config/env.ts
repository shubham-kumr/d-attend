import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/d-attend',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-for-development',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  
  // Blockchain Configuration
  RPC_URL: process.env.RPC_URL || 'http://localhost:8545',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // General settings
  API_PREFIX: process.env.API_PREFIX || '/api',
};