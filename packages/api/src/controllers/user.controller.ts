import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserAdapter } from '../models/ipfs.models';
import { logger } from '../utils/logger';
import config from '../config';

export const userController = {
  // Register a new user
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await UserAdapter.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await UserAdapter.create({
        email,
        password: hashedPassword,
        name
      });

      // Create token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '1d' }
      );

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        token
      });
    } catch (error) {
      logger.error('Error in user registration:', error);
      res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
  },

  // Login user
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserAdapter.findByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Create token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '1d' }
      );

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        token
      });
    } catch (error) {
      logger.error('Error in user login:', error);
      res.status(500).json({ message: 'Server error during login', error: error.message });
    }
  },

  // Get user profile
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const user = await UserAdapter.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profileImage: user.profileImage,
        bio: user.bio
      });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Update user profile
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { name, walletAddress, bio } = req.body;

      const user = await UserAdapter.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updatedUser = await UserAdapter.update(userId, {
        name: name || user.name,
        walletAddress: walletAddress || user.walletAddress,
        bio: bio || user.bio
      });

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        walletAddress: updatedUser.walletAddress,
        profileImage: updatedUser.profileImage,
        bio: updatedUser.bio
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get all users (admin only)
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserAdapter.findAll();
      
      res.json(users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profileImage: user.profileImage
      })));
    } catch (error) {
      logger.error('Error getting all users:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Update wallet address
  async updateWalletAddress(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ message: 'Wallet address is required' });
      }

      const user = await UserAdapter.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updatedUser = await UserAdapter.update(userId, { walletAddress });

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        walletAddress: updatedUser.walletAddress
      });
    } catch (error) {
      logger.error('Error updating wallet address:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};