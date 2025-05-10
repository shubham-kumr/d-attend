import { prisma } from '../models/prisma';
// import { ROLES } from '@d-attend/common/constants/roles';

export const organizationService = {
  async getOrganizationById(id: string) {
    return await prisma.organization.findUnique({
      where: { id },
    });
  },

  async getAllOrganizations() {
    return await prisma.organization.findMany();
  },

  async createOrganization(data: any) {
    return await prisma.organization.create({
      data,
    });
  },

  async updateOrganization(id: string, data: any) {
    return await prisma.organization.update({
      where: { id },
      data,
    });
  },

  async deleteOrganization(id: string) {
    return await prisma.organization.delete({
      where: { id },
    });
  },
};