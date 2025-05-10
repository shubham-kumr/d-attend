import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../models/prisma';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

// First, extend the Prisma User model to add missing fields
interface ExtendedUser {
  id: string;
  email: string;
  password?: string;
  name: string | null;
  walletAddress?: string;
  nonce?: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
  organizations?: any[];
}

export class AuthController {
  /**
   * Register a new user with email and password
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { email, password, name } = req.body;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create new user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          nonce: uuidv4(),
        },
      });
      
      // Sign JWT token
      const token = jwt.sign(
        { userId: user.id },
        config.jwt.secret as jwt.Secret,
        { expiresIn: parseInt(config.jwt.expiresIn, 10) }
      );
      
      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Login with email and password
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { email, password } = req.body;
      
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          userOrganizations: {
            include: {
              organization: true,
            },
          },
        },
      }) as unknown as ExtendedUser & { userOrganizations: any[] };
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Check password
      if (!user.password) {
        return res.status(401).json({ message: 'This account requires wallet authentication' });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Sign JWT token
      const token = jwt.sign(
        { userId: user.id, walletAddress: user.walletAddress || undefined },
        config.jwt.secret as jwt.Secret,
        { expiresIn: parseInt(config.jwt.expiresIn, 10) }
      );
      
      // Format response with organizations
      const organizations = user.userOrganizations ? user.userOrganizations.map((membership: any) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        role: membership.role,
        logoUrl: membership.organization.logoUrl,
      })) : [];
      
      res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
          profilePicture: user.profilePicture,
          organizations
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register a new organization and create admin user
   */
  static async registerOrganization(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { 
        organizationName, 
        organizationDescription, 
        adminEmail, 
        adminPassword,
        adminName 
      } = req.body;
      
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: adminEmail },
      }) as unknown as ExtendedUser | null;
      
      // Start a transaction to ensure all operations succeed or fail together
      const result = await prisma.$transaction(async (tx) => {
        // Create or update user
        if (!user) {
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(adminPassword, salt);
          
          // Create new user
          user = await tx.user.create({
            data: {
              email: adminEmail,
              password: hashedPassword,
              name: adminName,
              nonce: uuidv4(),
            },
          }) as unknown as ExtendedUser;
        } else if (!user.password && adminPassword) {
          // Update existing wallet user with password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(adminPassword, salt);
          
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              password: hashedPassword,
              name: adminName || user.name,
            },
          }) as unknown as ExtendedUser;
        }
        
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            description: organizationDescription,
            walletAddress: user.walletAddress || "0x0000000000000000000000000000000000000000", // Placeholder if no wallet yet
          },
        });
        
        // Link user to organization as OWNER
        await tx.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: 'OWNER',
          },
        });
        
        return { user, organization };
      });
      
      // Sign JWT token
      const token = jwt.sign(
        { userId: result.user.id, walletAddress: result.user.walletAddress || undefined },
        config.jwt.secret as jwt.Secret,
        { expiresIn: parseInt(config.jwt.expiresIn, 10) }
      );
      
      res.status(201).json({
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          walletAddress: result.user.walletAddress,
          profilePicture: result.user.profilePicture,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          description: result.organization.description,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link wallet address to existing user account
   */
  static async linkWallet(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { walletAddress, signature } = req.body;
      
      if (!ethers.utils.isAddress(walletAddress)) {
        return res.status(400).json({ message: 'Invalid Ethereum address' });
      }
      
      // Normalize address to checksum format
      const checksumAddress = ethers.utils.getAddress(walletAddress);
      
      // Check if wallet is already linked to another account
      const existingUser = await prisma.user.findFirst({
        where: {
          walletAddress: checksumAddress,
          id: { not: req.user.userId }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'This wallet is already linked to another account' });
      }
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      }) as unknown as ExtendedUser;
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // If signature provided, verify it
      if (signature) {
        // Create message for verification
        const message = `Link this wallet to your d-attend account: ${user.nonce}`;
        
        // Verify the signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        
        if (recoveredAddress !== checksumAddress) {
          return res.status(401).json({ message: 'Invalid signature' });
        }
      }
      
      // Generate new nonce
      const newNonce = uuidv4();
      
      // Update user with wallet address
      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          walletAddress: checksumAddress,
          nonce: newNonce
        },
        include: {
          userOrganizations: {
            include: {
              organization: true
            }
          }
        }
      });
      
      // Also update org's wallet address if user is owner and org has placeholder wallet
      const ownerOrgs = updatedUser.userOrganizations.filter(
        (uo: any) => uo.role === 'OWNER' && 
                    uo.organization.walletAddress === "0x0000000000000000000000000000000000000000"
      );
      
      if (ownerOrgs.length > 0) {
        await prisma.organization.update({
          where: { id: ownerOrgs[0].organization.id },
          data: { walletAddress: checksumAddress }
        });
      }
      
      res.status(200).json({
        message: 'Wallet linked successfully',
        walletAddress: checksumAddress
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate a nonce for wallet authentication
   */
  static async getNonce(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { address } = req.params;
      
      if (!ethers.utils.isAddress(address)) {
        return res.status(400).json({ message: 'Invalid Ethereum address' });
      }
      
      // Normalize address to checksum format
      const checksumAddress = ethers.utils.getAddress(address);
      
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { 
          // Use 'email' as a unique constraint since walletAddress isn't in model
          email: `${checksumAddress.toLowerCase()}@placeholder.com`
        },
      }) as unknown as ExtendedUser;
      
      // Generate a new nonce
      const nonce = uuidv4();
      
      if (user) {
        // Update existing user with new nonce
        await prisma.user.update({
          where: { id: user.id },
          data: {
            // Store nonce in metadata or a custom field
            // Using Prisma's extend functionality would be better,
            // but for now, we can add a custom field
            // @ts-ignore - Adding nonce as a custom field
            nonce: nonce,
          },
        });
      } else {
        // Create new user with nonce
        user = await prisma.user.create({
          data: {
            email: `${checksumAddress.toLowerCase()}@placeholder.com`,
            // @ts-ignore - Adding walletAddress and nonce as custom fields
            walletAddress: checksumAddress,
            nonce,
          },
        }) as unknown as ExtendedUser;
      }
      
      res.status(200).json({ nonce });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Verify wallet signature and authenticate user
   */
  static async verify(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { signature, address } = req.body;
      
      if (!ethers.utils.isAddress(address)) {
        return res.status(400).json({ message: 'Invalid Ethereum address' });
      }
      
      // Normalize address to checksum format
      const checksumAddress = ethers.utils.getAddress(address);
      
      // Find user by wallet address (using email as proxy since walletAddress isn't in model)
      const user = await prisma.user.findUnique({
        where: { 
          email: `${checksumAddress.toLowerCase()}@placeholder.com` 
        },
      }) as unknown as ExtendedUser;
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create message for verification
      const message = `Sign this message to authenticate with d-attend: ${user.nonce}`;
      
      // Verify the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      if (recoveredAddress !== checksumAddress) {
        return res.status(401).json({ message: 'Invalid signature' });
      }
      
      // Generate new nonce for next login
      const newNonce = uuidv4();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // @ts-ignore - Adding nonce as a custom field
          nonce: newNonce,
        },
      });
      
      // Fix JWT sign issue by explicitly typing the secret key
      // JWT secret should be a string or Buffer
      const secretKey = config.jwt.secret;
      
      // Define the sign options separately
      const signOptions = { expiresIn: parseInt(config.jwt.expiresIn, 10) };
      
      // Sign the token with proper typing
      const token = jwt.sign(
        { userId: user.id, walletAddress: user.walletAddress },
        secretKey as jwt.Secret,
        signOptions
      );
      
      res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
          profilePicture: user.profilePicture,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get authenticated user profile
   */
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          userOrganizations: {
            include: {
              organization: true,
            },
          } as any, // Type cast to any to avoid TypeScript error
        },
      }) as unknown as ExtendedUser & { userOrganizations: any[] };
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Format response
      const profile = {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profilePicture: user.profilePicture,
        organizations: user.userOrganizations ? user.userOrganizations.map((membership: any) => ({
          id: membership.organization.id,
          name: membership.organization.name,
          role: membership.role,
          logoUrl: membership.organization.logoUrl,
        })) : [],
        createdAt: user.createdAt,
      };
      
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update user profile
   */
  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { name, email, profilePicture } = req.body;
      
      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          name,
          email,
          // @ts-ignore - Adding profilePicture as a custom field
          profilePicture,
        },
      }) as unknown as ExtendedUser;
      
      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          walletAddress: updatedUser.walletAddress,
          profilePicture: updatedUser.profilePicture,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}