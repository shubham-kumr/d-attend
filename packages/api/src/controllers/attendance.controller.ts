import { Request, Response } from 'express';
import { AttendanceAdapter, ServerAdapter, UserOrganizationAdapter } from '../models/ipfs.models';
import { logger } from '../utils/logger';

export const attendanceController = {
  // Record a new attendance check-in
  async checkIn(req: Request, res: Response) {
    try {
      const { userId, organizationId, serverId, metadata } = req.body;
      const checkInTime = new Date();

      // Verify the server exists
      const server = await ServerAdapter.findById(serverId);
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Verify organization matches server
      if (server.organizationId !== organizationId) {
        return res.status(400).json({ message: 'Server does not belong to the specified organization' });
      }

      // Check if user is part of the organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, organizationId);
      if (!userOrg) {
        return res.status(403).json({ message: 'User is not a member of this organization' });
      }

      // Create attendance record
      const attendance = await AttendanceAdapter.create({
        userId,
        organizationId,
        serverId,
        checkInTime,
        status: 'ACTIVE',
        metadata
      });

      res.status(201).json(attendance);
    } catch (error) {
      logger.error('Error recording attendance check-in:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Record attendance check-out
  async checkOut(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const checkOutTime = new Date();

      // Find attendance record
      const attendance = await AttendanceAdapter.findById(id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }

      // Calculate duration in minutes
      const checkInTime = new Date(attendance.checkInTime);
      const durationMs = checkOutTime.getTime() - checkInTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      // Update attendance record
      const updatedAttendance = await AttendanceAdapter.update(id, {
        checkOutTime,
        status: 'COMPLETED',
        duration: durationMinutes
      });

      res.json(updatedAttendance);
    } catch (error) {
      logger.error('Error recording attendance check-out:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get attendance by ID
  async getAttendance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const attendance = await AttendanceAdapter.findById(id);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }

      res.json(attendance);
    } catch (error) {
      logger.error('Error getting attendance record:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get attendance records by user
  async getUserAttendance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const records = await AttendanceAdapter.findByUser(userId);
      res.json(records);
    } catch (error) {
      logger.error('Error getting user attendance records:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get attendance records by organization
  async getOrganizationAttendance(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id;

      // Check if user is part of the organization
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, organizationId);
      if (!userOrg) {
        return res.status(403).json({ message: 'Not authorized to view attendance for this organization' });
      }

      const records = await AttendanceAdapter.findByOrganization(organizationId);
      res.json(records);
    } catch (error) {
      logger.error('Error getting organization attendance records:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get attendance records by server
  async getServerAttendance(req: Request, res: Response) {
    try {
      const { serverId } = req.params;
      const userId = req.user.id;

      // Verify the server exists
      const server = await ServerAdapter.findById(serverId);
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Check if user is part of the organization that owns the server
      const userOrg = await UserOrganizationAdapter.findByUserAndOrg(userId, server.organizationId);
      if (!userOrg) {
        return res.status(403).json({ message: 'Not authorized to view attendance for this server' });
      }

      const records = await AttendanceAdapter.findByServer(serverId);
      res.json(records);
    } catch (error) {
      logger.error('Error getting server attendance records:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get current user attendance records
  async getCurrentUserAttendance(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      
      const records = await AttendanceAdapter.findByUser(userId);
      res.json(records);
    } catch (error) {
      logger.error('Error getting current user attendance records:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};