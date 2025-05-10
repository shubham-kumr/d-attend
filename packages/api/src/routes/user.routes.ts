import express from 'express';
import { userController } from '../controllers/user.controller';
import { auth } from '../middleware/auth.middleware';
import { ipfsUpload } from '../middleware/ipfs-upload.middleware';

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, ipfsUpload.single('profileImage'), userController.updateProfile);
router.put('/wallet', auth, userController.updateWalletAddress);

// Admin routes
router.get('/', auth, userController.getAllUsers);

export const userRoutes = router;