import { ipfsService, IPFSDocument } from '../services/ipfs.service';

// Define interfaces for our data models
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  walletAddress?: string;
  profileImage?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  walletAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Server {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  apiKey?: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Attendance {
  id: string;
  userId: string;
  organizationId: string;
  serverId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  duration?: number;
  status: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Credential {
  id: string;
  userId: string;
  organizationId: string;
  tokenId: string;
  tokenUri?: string;
  metadata?: Record<string, any>;
  issuedAt: Date;
  expiresAt?: Date;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Adapter classes for each model
export class UserAdapter {
  static async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const document = await ipfsService.create<User>('users', data);
    return this.fromIPFS(document);
  }

  static async findById(id: string): Promise<User | null> {
    const document = await ipfsService.findById('users', id);
    return document ? this.fromIPFS(document) : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const documents = await ipfsService.findMany('users', { 'data.email': email });
    return documents.length > 0 ? this.fromIPFS(documents[0]) : null;
  }

  static async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const documents = await ipfsService.findMany('users', { 'data.walletAddress': walletAddress });
    return documents.length > 0 ? this.fromIPFS(documents[0]) : null;
  }

  static async update(id: string, data: Partial<User>): Promise<User | null> {
    const document = await ipfsService.update('users', id, data);
    return document ? this.fromIPFS(document) : null;
  }

  static async delete(id: string): Promise<boolean> {
    return await ipfsService.delete('users', id);
  }

  static async findAll(): Promise<User[]> {
    const documents = await ipfsService.findMany('users');
    return documents.map(doc => this.fromIPFS(doc));
  }

  static fromIPFS(document: IPFSDocument): User {
    return {
      id: document.id,
      ...document.data,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    } as User;
  }
}

export class OrganizationAdapter {
  static async create(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    const document = await ipfsService.create<Organization>('organizations', data);
    return this.fromIPFS(document);
  }

  static async findById(id: string): Promise<Organization | null> {
    const document = await ipfsService.findById('organizations', id);
    return document ? this.fromIPFS(document) : null;
  }

  static async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
    const document = await ipfsService.update('organizations', id, data);
    return document ? this.fromIPFS(document) : null;
  }

  static async delete(id: string): Promise<boolean> {
    return await ipfsService.delete('organizations', id);
  }

  static async findAll(): Promise<Organization[]> {
    const documents = await ipfsService.findMany('organizations');
    return documents.map(doc => this.fromIPFS(doc));
  }

  static fromIPFS(document: IPFSDocument): Organization {
    return {
      id: document.id,
      ...document.data,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    } as Organization;
  }
}

export class UserOrganizationAdapter {
  static async create(data: Omit<UserOrganization, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserOrganization> {
    const document = await ipfsService.create<UserOrganization>('userOrganizations', data);
    return this.fromIPFS(document);
  }

  static async findById(id: string): Promise<UserOrganization | null> {
    const document = await ipfsService.findById('userOrganizations', id);
    return document ? this.fromIPFS(document) : null;
  }

  static async findByUserAndOrg(userId: string, organizationId: string): Promise<UserOrganization | null> {
    const documents = await ipfsService.findMany('userOrganizations', { 
      'data.userId': userId, 
      'data.organizationId': organizationId 
    });
    return documents.length > 0 ? this.fromIPFS(documents[0]) : null;
  }

  static async findByUser(userId: string): Promise<UserOrganization[]> {
    const documents = await ipfsService.findMany('userOrganizations', { 'data.userId': userId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async findByOrganization(organizationId: string): Promise<UserOrganization[]> {
    const documents = await ipfsService.findMany('userOrganizations', { 'data.organizationId': organizationId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async update(id: string, data: Partial<UserOrganization>): Promise<UserOrganization | null> {
    const document = await ipfsService.update('userOrganizations', id, data);
    return document ? this.fromIPFS(document) : null;
  }

  static async delete(id: string): Promise<boolean> {
    return await ipfsService.delete('userOrganizations', id);
  }

  static fromIPFS(document: IPFSDocument): UserOrganization {
    return {
      id: document.id,
      ...document.data,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    } as UserOrganization;
  }
}

export class ServerAdapter {
  static async create(data: Omit<Server, 'id' | 'createdAt' | 'updatedAt'>): Promise<Server> {
    const document = await ipfsService.create<Server>('servers', data);
    return this.fromIPFS(document);
  }

  static async findById(id: string): Promise<Server | null> {
    const document = await ipfsService.findById('servers', id);
    return document ? this.fromIPFS(document) : null;
  }

  static async findByOrganization(organizationId: string): Promise<Server[]> {
    const documents = await ipfsService.findMany('servers', { 'data.organizationId': organizationId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async update(id: string, data: Partial<Server>): Promise<Server | null> {
    const document = await ipfsService.update('servers', id, data);
    return document ? this.fromIPFS(document) : null;
  }

  static async delete(id: string): Promise<boolean> {
    return await ipfsService.delete('servers', id);
  }

  static fromIPFS(document: IPFSDocument): Server {
    return {
      id: document.id,
      ...document.data,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    } as Server;
  }
}

export class AttendanceAdapter {
  static async create(data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Attendance> {
    const document = await ipfsService.create<Attendance>('attendances', data);
    return this.fromIPFS(document);
  }

  static async findById(id: string): Promise<Attendance | null> {
    const document = await ipfsService.findById('attendances', id);
    return document ? this.fromIPFS(document) : null;
  }

  static async findByUser(userId: string): Promise<Attendance[]> {
    const documents = await ipfsService.findMany('attendances', { 'data.userId': userId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async findByOrganization(organizationId: string): Promise<Attendance[]> {
    const documents = await ipfsService.findMany('attendances', { 'data.organizationId': organizationId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async findByServer(serverId: string): Promise<Attendance[]> {
    const documents = await ipfsService.findMany('attendances', { 'data.serverId': serverId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async update(id: string, data: Partial<Attendance>): Promise<Attendance | null> {
    const document = await ipfsService.update('attendances', id, data);
    return document ? this.fromIPFS(document) : null;
  }

  static async delete(id: string): Promise<boolean> {
    return await ipfsService.delete('attendances', id);
  }

  static fromIPFS(document: IPFSDocument): Attendance {
    return {
      id: document.id,
      ...document.data,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    } as Attendance;
  }
}

export class CredentialAdapter {
  static async create(data: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>): Promise<Credential> {
    const document = await ipfsService.create<Credential>('credentials', data);
    return this.fromIPFS(document);
  }

  static async findById(id: string): Promise<Credential | null> {
    const document = await ipfsService.findById('credentials', id);
    return document ? this.fromIPFS(document) : null;
  }

  static async findByUser(userId: string): Promise<Credential[]> {
    const documents = await ipfsService.findMany('credentials', { 'data.userId': userId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async findByOrganization(organizationId: string): Promise<Credential[]> {
    const documents = await ipfsService.findMany('credentials', { 'data.organizationId': organizationId });
    return documents.map(doc => this.fromIPFS(doc));
  }

  static async update(id: string, data: Partial<Credential>): Promise<Credential | null> {
    const document = await ipfsService.update('credentials', id, data);
    return document ? this.fromIPFS(document) : null;
  }

  static async delete(id: string): Promise<boolean> {
    return await ipfsService.delete('credentials', id);
  }

  static fromIPFS(document: IPFSDocument): Credential {
    return {
      id: document.id,
      ...document.data,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    } as Credential;
  }
}