Let me continue with the implementation plan for the backend API.

## Phase 5: Controllers Implementation (continued)

### 5.2 Organization Controller (continued)

```typescript
            userId,
            organizationId,
          },
        },
      });
      
      res.status(200).json({
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### 5.3 Server Controller

**src/controllers/server.controller.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../models/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export class ServerController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId } = req.params;
      const { name, description, location } = req.body;
      
      // Check if user is admin or owner in the organization
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
        return res.status(403).json({ message: 'Admin permissions required' });
      }
      
      // Create server
      const server = await prisma.server.create({
        data: {
          name,
          description,
          location,
          organizationId,
        },
      });
      
      res.status(201).json({
        message: 'Server created successfully',
        server,
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId } = req.params;
      
      // Check if user is member of the organization
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this organization' });
      }
      
      // Get all servers for the organization
      const servers = await prisma.server.findMany({
        where: { organizationId },
      });
      
      res.status(200).json({ servers });
    } catch (error) {
      next(error);
    }
  }
  
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId, serverId } = req.params;
      
      // Check if user is member of the organization
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this organization' });
      }
      
      // Get server details
      const server = await prisma.server.findFirst({
        where: {
          id: serverId,
          organizationId,
        },
      });
      
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }
      
      res.status(200).json({ server });
    } catch (error) {
      next(error);
    }
  }
  
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId, serverId } = req.params;
      const { name, description, location } = req.body;
      
      // Check if user is admin or owner
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
        return res.status(403).json({ message: 'Admin permissions required' });
      }
      
      // Check if server exists
      const server = await prisma.server.findFirst({
        where: {
          id: serverId,
          organizationId,
        },
      });
      
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }
      
      // Update server
      const updatedServer = await prisma.server.update({
        where: { id: serverId },
        data: {
          name,
          description,
          location,
        },
      });
      
      res.status(200).json({
        message: 'Server updated successfully',
        server: updatedServer,
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId, serverId } = req.params;
      
      // Check if user is admin or owner
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
        return res.status(403).json({ message: 'Admin permissions required' });
      }
      
      // Check if server exists
      const server = await prisma.server.findFirst({
        where: {
          id: serverId,
          organizationId,
        },
      });
      
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }
      
      // Delete server (this will cascade to attendances)
      await prisma.server.delete({
        where: { id: serverId },
      });
      
      res.status(200).json({
        message: 'Server deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### 5.4 Attendance Controller

**src/controllers/attendance.controller.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ethers } from 'ethers';
import { prisma } from '../models/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export class AttendanceController {
  static async checkIn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { serverId } = req.params;
      
      // Check if server exists
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        include: { organization: true },
      });
      
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }
      
      // Check if user is a member of the organization
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId: server.organizationId,
          },
        },
      });
      
      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this organization' });
      }
      
      // Check if user already has an active attendance
      const activeAttendance = await prisma.attendance.findFirst({
        where: {
          userId: req.user.userId,
          serverId,
          status: 'ACTIVE',
        },
      });
      
      if (activeAttendance) {
        return res.status(400).json({ message: 'You already have an active attendance record' });
      }
      
      // Create proof hash
      const timestamp = new Date();
      const proofMessage = `${req.user.userId}|${serverId}|${timestamp.toISOString()}`;
      const proofHash = ethers.utils.id(proofMessage);
      
      // Create attendance record
      const attendance = await prisma.attendance.create({
        data: {
          userId: req.user.userId,
          serverId,
          checkInTime: timestamp,
          proofHash,
        },
      });
      
      res.status(201).json({
        message: 'Check-in successful',
        attendance,
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async checkOut(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { attendanceId } = req.params;
      
      // Find attendance record
      const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: { server: true },
      });
      
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }
      
      // Check if attendance belongs to user
      if (attendance.userId !== req.user.userId) {
        return res.status(403).json({ message: 'You can only check out from your own attendance' });
      }
      
      // Check if attendance is active
      if (attendance.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'This attendance record is not active' });
      }
      
      // Update attendance record
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          checkOutTime: new Date(),
          status: 'COMPLETED',
        },
      });
      
      res.status(200).json({
        message: 'Check-out successful',
        attendance: updatedAttendance,
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getByUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { status, page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // Build filter
      const filter: any = { userId: req.user.userId };
      if (status) {
        filter.status = status;
      }
      
      // Get attendance records
      const attendances = await prisma.attendance.findMany({
        where: filter,
        include: {
          server: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { checkInTime: 'desc' },
        skip,
        take: limitNum,
      });
      
      // Get total count
      const totalCount = await prisma.attendance.count({
        where: filter,
      });
      
      res.status(200).json({
        attendances,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getByOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId } = req.params;
      const { status, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // Check if user is admin or owner
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
        return res.status(403).json({ message: 'Admin permissions required' });
      }
      
      // Get servers for this organization
      const servers = await prisma.server.findMany({
        where: { organizationId },
        select: { id: true },
      });
      
      const serverIds = servers.map(server => server.id);
      
      // Build filter
      const filter: any = { serverId: { in: serverIds } };
      if (status) {
        filter.status = status;
      }
      
      // Get attendance records
      const attendances = await prisma.attendance.findMany({
        where: filter,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              walletAddress: true,
              email: true,
            },
          },
          server: true,
        },
        orderBy: { checkInTime: 'desc' },
        skip,
        take: limitNum,
      });
      
      // Get total count
      const totalCount = await prisma.attendance.count({
        where: filter,
      });
      
      res.status(200).json({
        attendances,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async verifyAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { proofHash } = req.params;
      
      // Find attendance by proof hash
      const attendance = await prisma.attendance.findFirst({
        where: { proofHash },
        include: {
          user: {
            select: {
              walletAddress: true,
              name: true,
            },
          },
          server: {
            include: {
              organization: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
      
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }
      
      res.status(200).json({
        verified: true,
        attendance: {
          id: attendance.id,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          status: attendance.status,
          user: attendance.user,
          server: attendance.server,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### 5.5 Credential Controller

**src/controllers/credential.controller.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../models/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { ethers } from 'ethers';

export class CredentialController {
  static async issueCredential(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId } = req.params;
      const { userId, type, data, expiresAt } = req.body;
      
      // Check if user is admin or owner
      const adminMembership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!adminMembership || (adminMembership.role !== 'ADMIN' && adminMembership.role !== 'OWNER')) {
        return res.status(403).json({ message: 'Admin permissions required' });
      }
      
      // Check if target user is a member of the organization
      const targetMembership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });
      
      if (!targetMembership) {
        return res.status(404).json({ message: 'User is not a member of this organization' });
      }
      
      // Create credential
      const credential = await prisma.credential.create({
        data: {
          userId,
          organizationId,
          type,
          data,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          user: {
            select: {
              walletAddress: true,
              name: true,
            },
          },
          organization: {
            select: {
              name: true,
              walletAddress: true,
            },
          },
        },
      });
      
      res.status(201).json({
        message: 'Credential issued successfully',
        credential,
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getByUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { revoked, type } = req.query;
      
      // Build filter
      const filter: any = { userId: req.user.userId };
      
      if (typeof revoked === 'string' && revoked !== '') {
        filter.revoked = revoked === 'true';
      }
      
      if (typeof type === 'string' && type !== '') {
        filter.type = type;
      }
      
      // Get credentials
      const credentials = await prisma.credential.findMany({
        where: filter,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
      });
      
      res.status(200).json({ credentials });
    } catch (error) {
      next(error);
    }
  }
  
  static async getByOrganization(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { organizationId } = req.params;
      const { revoked, type, userId } = req.query;
      
      // Check if user is admin or owner
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });
      
      if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
        return res.status(403).json({ message: 'Admin permissions required' });
      }
      
      // Build filter
      const filter: any = { organizationId };
      
      if (typeof revoked === 'string' && revoked !== '') {
        filter.revoked = revoked === 'true';
      }
      
      if (typeof type === 'string' && type !== '') {
        filter.type = type;
      }
      
      if (typeof userId === 'string' && userId !== '') {
        filter.userId = userId;
      }
      
      // Get credentials
      const credentials = await prisma.credential.findMany({
        where: filter,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              walletAddress: true,
              email: true,
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
      });
      
      res.status(200).json({ credentials });
    } catch (error) {
      next(error);
    }
  }
  
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { credentialId } = req.params;
      
      // Get credential
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              walletAddress: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              walletAddress: true,
            },
          },
        },
      });
      
      if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
      }
      
      // Check access permissions
      const isIssuer = credential.organizationId && await prisma.userOrganization.findFirst({
        where: {
          userId: req.user.userId,
          organizationId: credential.organizationId,
          role: { in: ['ADMIN', 'OWNER'] },
        },
      });
      
      const isOwner = credential.userId === req.user.userId;
      
      if (!isIssuer && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to view this credential' });
      }
      
      res.status(200).json({ credential });
    } catch (error) {
      next(error);
    }
  }
  
  static async revokeCredential(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { credentialId } = req.params;
      
      // Get credential
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });
      
      if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
      }
      
      // Check if user is admin or owner of the issuing organization
      const isIssuer = credential.organizationId && await prisma.userOrganization.findFirst({
        where: {
          userId: req.user.userId,
          organizationId: credential.organizationId,
          role: { in: ['ADMIN', 'OWNER'] },
        },
      });
      
      if (!isIssuer) {
        return res.status(403).json({ message: 'Only organization admins can revoke credentials' });
      }
      
      // Revoke credential
      const updatedCredential = await prisma.credential.update({
        where: { id: credentialId },
        data: { revoked: true },
      });
      
      res.status(200).json({
        message: 'Credential revoked successfully',
        credential: updatedCredential,
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async verifyCredential(req: Request, res: Response, next: NextFunction) {
    try {
      const { credentialId } = req.params;
      
      // Get credential
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
        include: {
          user: {
            select: {
              walletAddress: true,
              name: true,
            },
          },
          organization: {
            select: {
              name: true,
              walletAddress: true,
              logoUrl: true,
            },
          },
        },
      });
      
      if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
      }
      
      // Check if credential is valid
      const isRevoked = credential.revoked;
      const isExpired = credential.expiresAt ? new Date() > credential.expiresAt : false;
      
      res.status(200).json({
        valid: !isRevoked && !isExpired,
        revoked: isRevoked,
        expired: isExpired,
        credential: {
          id: credential.id,
          type: credential.type,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
          user: credential.user,
          organization: credential.organization,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
```

## Phase 6: Routes Definition

**src/routes/index.ts**
```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { OrganizationController } from '../controllers/organization.controller';
import { ServerController } from '../controllers/server.controller';
import { AttendanceController } from '../controllers/attendance.controller';
import { CredentialController } from '../controllers/credential.controller';
import { authenticate, isOrgAdmin, isOrgMember } from '../middleware/auth.middleware';
import { signatureValidator, profileUpdateValidator } from '../validators/auth.validator';

const router = Router();

// Auth routes
router.get('/auth/nonce/:address', AuthController.getNonce);
router.post('/auth/verify', signatureValidator, AuthController.verify);
router.get('/auth/profile', authenticate, AuthController.getProfile);
router.put('/auth/profile', authenticate, profileUpdateValidator, AuthController.updateProfile);

// Organization routes
router.post('/organizations', authenticate, [
  body('name').isString().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('description').optional().isString(),
  body('logoUrl').optional().isURL().withMessage('Logo URL must be a valid URL'),
  body('walletAddress').isString().matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid ethereum address is required'),
], OrganizationController.create);

router.get('/organizations', authenticate, OrganizationController.getAll);
router.get('/organizations/:organizationId', authenticate, OrganizationController.getById);

router.put('/organizations/:organizationId', authenticate, [
  body('name').optional().isString().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('description').optional().isString(),
  body('logoUrl').optional().isURL().withMessage('Logo URL must be a valid URL'),
], OrganizationController.update);

router.post('/organizations/:organizationId/members', authenticate, [
  body('walletAddress').isString().matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid ethereum address is required'),
  body('role').isIn(['MEMBER', 'ADMIN']).withMessage('Role must be either MEMBER or ADMIN'),
], OrganizationController.addMember);

router.delete('/organizations/:organizationId/members/:userId', authenticate, OrganizationController.removeMember);

// Server routes
router.post('/organizations/:organizationId/servers', authenticate, [
  body('name').isString().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('description').optional().isString(),
  body('location').optional().isString(),
], ServerController.create);

router.get('/organizations/:organizationId/servers', authenticate, ServerController.getAll);
router.get('/organizations/:organizationId/servers/:serverId', authenticate, ServerController.getById);

router.put('/organizations/:organizationId/servers/:serverId', authenticate, [
  body('name').optional().isString().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('description').optional().isString(),
  body('location').optional().isString(),
], ServerController.update);

router.delete('/organizations/:organizationId/servers/:serverId', authenticate, ServerController.delete);

// Attendance routes
router.post('/servers/:serverId/attendance', authenticate, AttendanceController.checkIn);
router.put('/attendance/:attendanceId/checkout', authenticate, AttendanceController.checkOut);
router.get('/attendance', authenticate, AttendanceController.getByUser);
router.get('/organizations/:organizationId/attendance', authenticate, AttendanceController.getByOrganization);
router.get('/attendance/verify/:proofHash', AttendanceController.verifyAttendance);

// Credential routes
router.post('/organizations/:organizationId/credentials', authenticate, [
  body('userId').isString().withMessage('User ID is required'),
  body('type').isString().withMessage('Credential type is required'),
  body('data').isObject().withMessage('Credential data must be an object'),
  body('expiresAt').optional().isISO8601().withMessage('Expiry date must be a valid ISO date'),
], CredentialController.issueCredential);

router.get('/credentials', authenticate, CredentialController.getByUser);
router.get('/organizations/:organizationId/credentials', authenticate, CredentialController.getByOrganization);
router.get('/credentials/:credentialId', authenticate, CredentialController.getById);
router.put('/credentials/:credentialId/revoke', authenticate, CredentialController.revokeCredential);
router.get('/credentials/:credentialId/verify', CredentialController.verifyCredential);

export default router;
```