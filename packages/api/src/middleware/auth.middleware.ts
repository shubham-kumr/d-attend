import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../models/prisma';
import { config } from '../config';
// Define Role enum locally instead of importing from @prisma/client
enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

// Extended Request with user property
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    walletAddress: string;
  };
}

/**
 * Authentication middleware
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; walletAddress: string };
      
      // Assign user to request
      req.user = {
        userId: decoded.userId,
        walletAddress: decoded.walletAddress,
      };
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Organization admin authorization middleware
 */
export const isOrgAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    
    const { organizationId } = req.params;
    if (!organizationId) {
      res.status(400).json({ message: 'Organization ID is required' });
      return;
    }
    
    // Check if user is admin or owner
    const membership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId,
        },
      },
    });
    
    if (!membership || (membership.role !== Role.ADMIN && membership.role !== Role.OWNER)) {
      res.status(403).json({ message: 'Admin privileges required' });
      return;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Organization member authorization middleware
 */
export const isOrgMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    
    const { organizationId } = req.params;
    if (!organizationId) {
      res.status(400).json({ message: 'Organization ID is required' });
      return;
    }
    
    // Check if user is a member
    const membership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId,
        },
      },
    });
    
    if (!membership) {
      res.status(403).json({ message: 'You must be a member of this organization' });
      return;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};