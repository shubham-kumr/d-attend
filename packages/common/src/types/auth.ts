import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  walletAddress: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}