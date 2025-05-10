import { Request, Response } from 'express';
import { OrganizationAdapter, UserOrganizationAdapter } from '../models/ipfs.models';
import { logger } from '../utils/logger';

export const organizationController = {
  // Create a new organization
  async createOrganization(req: Request, res: Response) {
    try {
      const { name, description, website, walletAddress, logo } = req.body;
      const userId = req.user.id;

      // Create organization
      const organization = await OrganizationAdapter.create({
        name,
        description,
        website,
        walletAddress,
        logo
      });

      // Add user as admin of the organization
      await UserOrganizationAdapter.create({
        userId,
        organizationId: organization.id,
        role: 'ADMIN',
        joinedAt: new Date()
      });

      res.status(201).json(organization);
    } catch (error) {
      logger.error('Error creating organization:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get organization by ID
  async getOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const organization = await OrganizationAdapter.findById(id);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Get users in organization
      const userOrganizations = await UserOrganizationAdapter.findByOrganization(id);
      
      res.json({
        ...organization,
        members: userOrganizations.length
      });
    } catch (error) {
      logger.error('Error getting organization:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Update organization
  async updateOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, description, website, walletAddress, logo } = req.body;

      // Check if organization exists
      const organization = await OrganizationAdapter.findById(id);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Check if user is admin of organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, id);
      if (!userOrg || userOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to update this organization' });
      }

      // Update organization
      const updatedOrg = await OrganizationAdapter.update(id, {
        name: name || organization.name,
        description: description !== undefined ? description : organization.description,
        website: website !== undefined ? website : organization.website,
        walletAddress: walletAddress !== undefined ? walletAddress : organization.walletAddress,
        logo: logo !== undefined ? logo : organization.logo
      });

      res.json(updatedOrg);
    } catch (error) {
      logger.error('Error updating organization:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get organizations for current user
  async getUserOrganizations(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      // Get user organization relations
      const userOrgs = await UserOrganizationAdapter.findByUser(userId);
      
      // If no organizations, return empty array
      if (userOrgs.length === 0) {
        return res.json([]);
      }

      // Get all organization details
      const orgPromises = userOrgs.map(async (userOrg) => {
        const org = await OrganizationAdapter.findById(userOrg.organizationId);
        if (!org) return null;
        
        return {
          ...org,
          role: userOrg.role,
          joinedAt: userOrg.joinedAt
        };
      });
      
      const organizations = await Promise.all(orgPromises);
      
      // Filter out any null values (in case an org was deleted)
      res.json(organizations.filter(Boolean));
    } catch (error) {
      logger.error('Error getting user organizations:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get all organizations (admin only)
  async getAllOrganizations(req: Request, res: Response) {
    try {
      const organizations = await OrganizationAdapter.findAll();
      res.json(organizations);
    } catch (error) {
      logger.error('Error getting all organizations:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};