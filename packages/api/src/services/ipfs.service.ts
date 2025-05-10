import { create as createIPFS } from 'ipfs-http-client';
import * as IPFS from 'ipfs-core';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { CID } from 'multiformats/cid';
import { setTimeout } from 'timers/promises';

// Custom error classes for better error handling
export class IPFSConnectionError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'IPFSConnectionError';
  }
}

export class IPFSOperationError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'IPFSOperationError';
  }
}

export interface IPFSDocument {
  id: string;
  type: string;
  data: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

// Retry configuration
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

export class IPFSService {
  private ipfs: any;
  private collections: Map<string, Map<string, IPFSDocument>> = new Map();
  private contentCache: Map<string, { content: any, timestamp: number }> = new Map();
  private readonly cacheTTL = 1000 * 60 * 10; // 10 minutes cache
  private retryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2
  };
  private isConnected = false;

  constructor() {
    this.initIPFS();
  }

  private async initIPFS() {
    try {
      // Try connecting to local IPFS daemon first
      const ipfsUrl = process.env.IPFS_API_URL || 'http://localhost:5001';
      this.ipfs = createIPFS({ url: ipfsUrl });
      
      // Test connection with retry
      await this.withRetry(() => this.ipfs.version());
      
      this.isConnected = true;
      logger.info(`Connected to external IPFS node at ${ipfsUrl}`);
    } catch (error) {
      logger.warn('Could not connect to external IPFS node, creating in-memory IPFS instance', error);
      try {
        // Fallback to in-memory IPFS node
        this.ipfs = await IPFS.create({
          repo: `./ipfs-storage-${Math.random()}`,
          start: true,
          config: {
            Addresses: {
              Swarm: []
            }
          }
        });
        this.isConnected = true;
        logger.info('In-memory IPFS node created');
      } catch (err) {
        this.isConnected = false;
        logger.error('Failed to initialize IPFS', err);
        throw new IPFSConnectionError('Failed to initialize IPFS storage', err);
      }
    }

    // Initialize in-memory collections for quick access
    this.collections.set('users', new Map());
    this.collections.set('organizations', new Map());
    this.collections.set('userOrganizations', new Map());
    this.collections.set('servers', new Map());
    this.collections.set('attendances', new Map());
    this.collections.set('credentials', new Map());
    
    // Start periodic health check
    this.startHealthCheck();
  }
  
  /**
   * Check if IPFS connection is healthy
   */
  private async checkHealth(): Promise<boolean> {
    try {
      await this.ipfs.version();
      return true;
    } catch (error) {
      logger.error('IPFS health check failed', error);
      this.isConnected = false;
      return false;
    }
  }
  
  /**
   * Start periodic health check
   */
  private startHealthCheck() {
    setInterval(async () => {
      if (!this.isConnected) {
        try {
          await this.reconnect();
        } catch (error) {
          logger.error('Failed to reconnect to IPFS', error);
        }
      } else {
        const isHealthy = await this.checkHealth();
        if (!isHealthy) {
          logger.warn('IPFS connection is unhealthy, attempting to reconnect');
          await this.reconnect();
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Attempt to reconnect to IPFS
   */
  private async reconnect() {
    try {
      logger.info('Attempting to reconnect to IPFS');
      await this.initIPFS();
      logger.info('Successfully reconnected to IPFS');
    } catch (error) {
      throw new IPFSConnectionError('Failed to reconnect to IPFS', error);
    }
  }
  
  /**
   * Execute an operation with retries
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    let delay = this.retryOptions.initialDelay;
    
    for (let attempt = 1; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Operation failed (attempt ${attempt}/${this.retryOptions.maxRetries}):`, error);
        
        // Exponential backoff with jitter
        const jitter = Math.random() * 0.3 * delay;
        delay = Math.min(delay * this.retryOptions.factor + jitter, this.retryOptions.maxDelay);
        
        if (attempt < this.retryOptions.maxRetries) {
          logger.info(`Retrying in ${delay}ms...`);
          await setTimeout(delay);
        }
      }
    }
    
    throw new IPFSOperationError(`Operation failed after ${this.retryOptions.maxRetries} attempts`, lastError);
  }

  /**
   * Store data in IPFS and in-memory cache
   */
  async create<T extends Record<string, any>>(collection: string, data: T): Promise<IPFSDocument> {
    if (!this.isConnected) {
      throw new IPFSConnectionError('IPFS is not connected');
    }
    
    try {
      const document: IPFSDocument = {
        id: data.id || uuidv4(),
        type: collection,
        data: { ...data },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in IPFS with retry
      const content = JSON.stringify(document);
      const addResult = await this.withRetry(async () => {
        return await this.ipfs.add(content);
      });

      const cid = addResult.cid.toString();

      // Pin the content to keep it with retry
      await this.withRetry(async () => {
        await this.ipfs.pin.add(addResult.cid);
      });

      // Store reference in collection map
      const collectionMap = this.getCollection(collection);
      collectionMap.set(document.id, document);
      
      // Add to content cache
      this.contentCache.set(cid, {
        content: document,
        timestamp: Date.now()
      });
      
      logger.info(`Created document in collection ${collection} with CID: ${cid}`);
      return document;
    } catch (error) {
      if (error instanceof IPFSConnectionError || error instanceof IPFSOperationError) {
        throw error;
      }
      logger.error(`Error creating document in collection ${collection}:`, error);
      throw new IPFSOperationError(`Failed to create document in IPFS: ${error.message}`, error);
    }
  }

  /**
   * Find a document by id
   */
  async findById(collection: string, id: string): Promise<IPFSDocument | null> {
    if (!this.isConnected) {
      throw new IPFSConnectionError('IPFS is not connected');
    }
    
    const collectionMap = this.getCollection(collection);
    const document = collectionMap.get(id);

    if (document) {
      return document;
    }

    // If not in memory, try to find it in IPFS cache
    // This would require additional indexing in a production environment
    return null;
  }

  /**
   * Find documents matching filter criteria
   */
  async findMany(collection: string, filter: Record<string, any> = {}): Promise<IPFSDocument[]> {
    if (!this.isConnected) {
      throw new IPFSConnectionError('IPFS is not connected');
    }
    
    const collectionMap = this.getCollection(collection);
    const documents = Array.from(collectionMap.values());

    return documents.filter(doc => {
      return Object.entries(filter).every(([key, value]) => {
        // Handle nested paths like 'data.userId'
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          return doc[parent] && doc[parent][child] === value;
        }
        return doc[key] === value || (doc.data && doc.data[key] === value);
      });
    });
  }

  /**
   * Update a document
   */
  async update(collection: string, id: string, data: Record<string, any>): Promise<IPFSDocument | null> {
    if (!this.isConnected) {
      throw new IPFSConnectionError('IPFS is not connected');
    }
    
    try {
      const document = await this.findById(collection, id);
      if (!document) {
        return null;
      }

      const updatedDocument: IPFSDocument = {
        ...document,
        data: { ...document.data, ...data },
        updatedAt: new Date()
      };

      // Store in IPFS with retry
      const content = JSON.stringify(updatedDocument);
      const addResult = await this.withRetry(async () => {
        return await this.ipfs.add(content);
      });

      const cid = addResult.cid.toString();

      // Pin the content with retry
      await this.withRetry(async () => {
        await this.ipfs.pin.add(addResult.cid);
      });

      // Update in-memory collection
      const collectionMap = this.getCollection(collection);
      collectionMap.set(id, updatedDocument);

      // Update content cache
      this.contentCache.set(cid, {
        content: updatedDocument,
        timestamp: Date.now()
      });
      
      logger.info(`Updated document in collection ${collection} with CID: ${cid}`);
      return updatedDocument;
    } catch (error) {
      if (error instanceof IPFSConnectionError || error instanceof IPFSOperationError) {
        throw error;
      }
      logger.error(`Error updating document in collection ${collection}:`, error);
      throw new IPFSOperationError(`Failed to update document in IPFS: ${error.message}`, error);
    }
  }

  /**
   * Delete a document
   */
  async delete(collection: string, id: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new IPFSConnectionError('IPFS is not connected');
    }
    
    try {
      const collectionMap = this.getCollection(collection);
      const document = collectionMap.get(id);

      if (document) {
        collectionMap.delete(id);
        // Note: We don't actually delete from IPFS as content is immutable
        // For a production system, you would need a pinning service and unpin
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error deleting document from collection ${collection}:`, error);
      throw new IPFSOperationError(`Failed to delete document: ${error.message}`, error);
    }
  }

  /**
   * Get content from IPFS by CID with caching
   */
  async getContentByCid(cid: string): Promise<any> {
    if (!this.isConnected) {
      throw new IPFSConnectionError('IPFS is not connected');
    }
    
    try {
      // Check cache first
      const cached = this.contentCache.get(cid);
      if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
        return cached.content;
      }
      
      // Fetch from IPFS with retry
      const content = await this.withRetry(async () => {
        const chunks = [];
        for await (const chunk of this.ipfs.cat(cid)) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString('utf8');
      });
      
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
        // Store in cache
        this.contentCache.set(cid, {
          content: parsedContent,
          timestamp: Date.now()
        });
      } catch (e) {
        // Not JSON, return as is (could be binary data)
        return content;
      }
      
      return parsedContent;
    } catch (error) {
      if (error instanceof IPFSConnectionError || error instanceof IPFSOperationError) {
        throw error;
      }
      logger.error(`Error retrieving content for CID ${cid}:`, error);
      throw new IPFSOperationError(`Failed to retrieve content from IPFS: ${error.message}`, error);
    }
  }

  /**
   * Upload a file to IPFS
   */
  async uploadFile(
    file: Buffer, 
    options: { fileName?: string; mimeType?: string } = {}
  ): Promise<{ cid: string; size: number }> {
    if (!this.isConnected) {
      throw new IPFSConnectionError('IPFS is not connected');
    }
    
    try {
      // Upload with metadata
      const result = await this.withRetry(async () => {
        return await this.ipfs.add({
          path: options.fileName || `file-${Date.now()}`,
          content: file
        }, {
          cidVersion: 1,
          hashAlg: 'sha2-256'
        });
      });
      
      // Pin the file
      await this.withRetry(async () => {
        await this.ipfs.pin.add(result.cid);
      });
      
      return {
        cid: result.cid.toString(),
        size: result.size
      };
    } catch (error) {
      if (error instanceof IPFSConnectionError || error instanceof IPFSOperationError) {
        throw error;
      }
      logger.error('Error uploading file to IPFS:', error);
      throw new IPFSOperationError(`Failed to upload file to IPFS: ${error.message}`, error);
    }
  }

  /**
   * Get collection map, creating it if it doesn't exist
   */
  private getCollection(name: string): Map<string, IPFSDocument> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }
}

// Singleton instance
export const ipfsService = new IPFSService();