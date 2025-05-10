import express from 'express';
import { organizationController } from '../controllers/organization.controller';
import { auth } from '../middleware/auth.middleware';
import { ipfsUpload } from '../middleware/ipfs-upload.middleware';

const router = express.Router();

// Protected routes
router.get('/', auth, organizationController.getUserOrganizations);
router.post('/', auth, ipfsUpload.single('logo'), organizationController.createOrganization);
router.get('/:id', auth, organizationController.getOrganization);
router.put('/:id', auth, ipfsUpload.single('logo'), organizationController.updateOrganization);

// Admin routes
router.get('/admin/all', auth, organizationController.getAllOrganizations);

export const organizationRoutes = router;