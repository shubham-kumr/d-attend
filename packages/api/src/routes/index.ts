import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { OrganizationController } from '../controllers/organization.controller';
import { ServerController } from '../controllers/server.controller';
import { AttendanceController } from '../controllers/attendance.controller';
import { CredentialController } from '../controllers/credential.controller';
import { authenticate } from '../middleware/auth.middleware';
import { signatureValidator, profileUpdateValidator } from '../validators/auth.validator';

const router = Router();

// Auth routes
router.get('/auth/nonce/:address', AuthController.getNonce);
router.post('/auth/verify', signatureValidator, AuthController.verify);
router.get('/auth/profile', authenticate, AuthController.getProfile);
router.put('/auth/profile', authenticate, profileUpdateValidator, AuthController.updateProfile);

// New auth routes for email/password login and organization registration
router.post('/auth/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').optional().isString().trim(),
], AuthController.register);

router.post('/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().withMessage('Password is required'),
], AuthController.login);

router.post('/auth/register-organization', [
  body('organizationName').isString().trim().isLength({ min: 3 }).withMessage('Organization name is required'),
  body('organizationDescription').optional().isString(),
  body('adminEmail').isEmail().withMessage('Valid admin email is required'),
  body('adminPassword').isString().isLength({ min: 6 }).withMessage('Admin password must be at least 6 characters'),
  body('adminName').optional().isString().trim(),
], AuthController.registerOrganization);

router.post('/auth/link-wallet', authenticate, [
  body('walletAddress').isString().matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid ethereum address is required'),
  body('signature').optional().isString(),
], AuthController.linkWallet);

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
router.post('/servers/:serverId/check-in', authenticate, AttendanceController.checkIn);
router.post('/attendance/:attendanceId/check-out', authenticate, AttendanceController.checkOut);
router.get('/attendance/user', authenticate, AttendanceController.getByUser);
router.get('/organizations/:organizationId/attendance', authenticate, AttendanceController.getByOrganization);
router.get('/attendance/verify/:proofHash', AttendanceController.verifyAttendance);

// Credential routes
router.post('/organizations/:organizationId/credentials', authenticate, CredentialController.issueCredential);
router.get('/credentials/user', authenticate, CredentialController.getByUser);
router.get('/organizations/:organizationId/credentials', authenticate, CredentialController.getByOrganization);
router.get('/credentials/:credentialId', authenticate, CredentialController.getById);
router.post('/credentials/:credentialId/revoke', authenticate, CredentialController.revokeCredential);
router.get('/credentials/:credentialId/verify', CredentialController.verifyCredential);

// Export the router as default
export default router;