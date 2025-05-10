import { env } from './env';

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  
  blockchain: {
    rpcUrl: env.RPC_URL,
    contractAddress: env.CONTRACT_ADDRESS,
  },
  
  cors: {
    origin: env.CORS_ORIGIN,
  },
  
  api: {
    prefix: env.API_PREFIX,
  },
};