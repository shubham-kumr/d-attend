import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ServerAdapter, UserOrganizationAdapter } from '../models/ipfs.models';
import { logger } from '../utils/logger';

export const serverController = {
  // Create a new server for an organization
  async createServer(req: Request, res: Response) {
    try {
      const { organizationId, name, description } = req.body;
      const userId = req.user.id;

      // Check if user is admin of organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, organizationId);
      if (!userOrg || userOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to create servers for this organization' });
      }

      // Generate API key
      const apiKey = uuidv4();

      // Create server
      const server = await ServerAdapter.create({
        organizationId,
        name,
        description,
        apiKey,
        status: 'ACTIVE'
      });

      res.status(201).json({
        id: server.id,
        organizationId: server.organizationId,
        name: server.name,
        description: server.description,
        status: server.status,
        apiKey: server.apiKey
      });
    } catch (error) {
      logger.error('Error creating server:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get server by ID
  async getServer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const server = await ServerAdapter.findById(id);
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Check if user has access to this organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, server.organizationId);
      if (!userOrg) {
        return res.status(403).json({ message: 'Not authorized to view this server' });
      }

      // Only show API key to admins
      const responseServer = {
        id: server.id,
        organizationId: server.organizationId,
        name: server.name,
        description: server.description,
        status: server.status
      };

      if (userOrg.role === 'ADMIN') {
        Object.assign(responseServer, { apiKey: server.apiKey });
      }

      res.json(responseServer);
    } catch (error) {
      logger.error('Error getting server:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Update server details
  async updateServer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, status } = req.body;
      const userId = req.user.id;

      const server = await ServerAdapter.findById(id);
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Check if user is admin of organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, server.organizationId);
      if (!userOrg || userOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to update this server' });
      }

      // Update server
      const updatedServer = await ServerAdapter.update(id, {
        name: name || server.name,
        description: description !== undefined ? description : server.description,
        status: status || server.status
      });

      res.json({
        id: updatedServer.id,
        organizationId: updatedServer.organizationId,
        name: updatedServer.name,
        description: updatedServer.description,
        status: updatedServer.status,
        apiKey: updatedServer.apiKey
      });
    } catch (error) {
      logger.error('Error updating server:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Regenerate API key
  async regenerateApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const server = await ServerAdapter.findById(id);
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Check if user is admin of organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, server.organizationId);
      if (!userOrg || userOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to regenerate API key for this server' });
      }

      // Generate new API key
      const apiKey = uuidv4();

      // Update server
      const updatedServer = await ServerAdapter.update(id, { apiKey });

      res.json({
        id: updatedServer.id,
        apiKey: updatedServer.apiKey
      });
    } catch (error) {
      logger.error('Error regenerating API key:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Delete server
  async deleteServer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const server = await ServerAdapter.findById(id);
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Check if user is admin of organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, server.organizationId);
      if (!userOrg || userOrg.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized to delete this server' });
      }

      // Delete server
      await ServerAdapter.delete(id);

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting server:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get servers by organization
  async getOrganizationServers(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id;

      // Check if user has access to this organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, organizationId);
      if (!userOrg) {
        return res.status(403).json({ message: 'Not authorized to view servers for this organization' });
      }

      const servers = await ServerAdapter.findByOrganization(organizationId);
      
      // Only include API keys if user is admin
      const responseServers = servers.map(server => {
        const serverResponse = {
          id: server.id,
          organizationId: server.organizationId,
          name: server.name,
          description: server.description,
          status: server.status
        };

        if (userOrg.role === 'ADMIN') {
          Object.assign(serverResponse, { apiKey: server.apiKey });
        }

        return serverResponse;
      });

      res.json(responseServers);
    } catch (error) {
      logger.error('Error getting organization servers:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};
