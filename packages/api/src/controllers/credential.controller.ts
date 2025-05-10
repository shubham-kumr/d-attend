import { Request, Response } from 'express';
import { CredentialAdapter, UserOrganizationAdapter } from '../models/ipfs.models';
import { logger } from '../utils/logger';

export const credentialController = {
  // Issue a new credential
  async issueCredential(req: Request, res: Response) {
    try {
      const { userId, organizationId, tokenId, tokenUri, metadata } = req.body;
      const adminUserId = req.user.id;

      // Verify admin has rights in the organization
      const adminUserOrg = await UserOrganizationAdapter.findByUserAndOrg(adminUserId, organizationId);
      if (!adminUserOrg || adminUserOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to issue credentials for this organization' });
      }

      // Check if user is part of the organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, organizationId);
      if (!userOrg) {
        return res.status(400).json({ message: 'User is not a member of this organization' });
      }

      // Create credential
      const credential = await CredentialAdapter.create({
        userId,
        organizationId,
        tokenId,
        tokenUri,
        metadata,
        issuedAt: new Date(),
        status: 'ACTIVE'
      });

      res.status(201).json(credential);
    } catch (error) {
      logger.error('Error issuing credential:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Revoke a credential
  async revokeCredential(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;

      // Find the credential
      const credential = await CredentialAdapter.findById(id);
      if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
      }

      // Verify admin has rights in the organization
      const adminUserOrg = await UserOrganizationAdapter.findByUserAndOrg(adminUserId, credential.organizationId);
      if (!adminUserOrg || adminUserOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to revoke credentials for this organization' });
      }

      // Update credential status
      const updatedCredential = await CredentialAdapter.update(id, { status: 'REVOKED' });

      res.json(updatedCredential);
    } catch (error) {
      logger.error('Error revoking credential:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get credential by ID
  async getCredential(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const credential = await CredentialAdapter.findById(id);
      if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
      }

      // Check if user owns the credential or is admin of the organization
      if (credential.userId !== userId) {
        const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, credential.organizationId);
        if (!userOrg || userOrg.role !== 'ADMIN') {
          return res.status(403).json({ message: 'Not authorized to view this credential' });
        }
      }

      res.json(credential);
    } catch (error) {
      logger.error('Error getting credential:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get credentials by user
  async getUserCredentials(req: Request, res: Response) {
    try {
      const userId = req.params.userId || req.user.id;

      // If requesting another user's credentials, check permissions
      if (userId !== req.user.id) {
        // This would typically require admin permissions
        // For now, just allow self-lookup
        return res.status(403).json({ message: 'Not authorized to view other users credentials' });
      }

      const credentials = await CredentialAdapter.findByUser(userId);
      res.json(credentials);
    } catch (error) {
      logger.error('Error getting user credentials:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get credentials by organization
  async getOrganizationCredentials(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id;

      // Check if user is admin of organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, organizationId);
      if (!userOrg || userOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to view all credentials for this organization' });
      }

      const credentials = await CredentialAdapter.findByOrganization(organizationId);
      res.json(credentials);
    } catch (error) {
      logger.error('Error getting organization credentials:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Verify a credential
  async verifyCredential(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const credential = await CredentialAdapter.findById(id);
      if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
      }

      // Check if credential is still valid
      const isValid = credential.status === 'ACTIVE';
      
      // Check if credential is expired
      const isExpired = credential.expiresAt ? new Date(credential.expiresAt) < new Date() : false;

      res.json({
        id: credential.id,
        isValid: isValid && !isExpired,
        status: credential.status,
        isExpired,
        organizationId: credential.organizationId,
        tokenId: credential.tokenId,
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt
      });
    } catch (error) {
      logger.error('Error verifying credential:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};