import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ipfsService, IPFSConnectionError, IPFSOperationError } from '../services/ipfs.service';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';

// Supported file types and their MIME types
const FILE_TYPES = {
  // Images
  images: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  // Documents
  documents: {
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.pdf', '.doc', '.docx'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  // JSON files
  json: {
    mimeTypes: ['application/json'],
    extensions: ['.json'],
    maxSize: 2 * 1024 * 1024 // 2MB
  },
  // CSV files
  csv: {
    mimeTypes: ['text/csv'],
    extensions: ['.csv'],
    maxSize: 5 * 1024 * 1024 // 5MB
  }
};

// Combine all supported types
const SUPPORTED_MIME_TYPES = Object.values(FILE_TYPES).flatMap(type => type.mimeTypes);
const SUPPORTED_EXTENSIONS = Object.values(FILE_TYPES).flatMap(type => type.extensions);

// Maximum file size (default: 10MB)
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configure temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(os.tmpdir(), 'ipfs-uploads');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collision
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uniqueSuffix}${fileExt}`);
  }
});

// File validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if the file type is supported
  const mimeType = file.mimetype.toLowerCase();
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (SUPPORTED_MIME_TYPES.includes(mimeType) || SUPPORTED_EXTENSIONS.includes(fileExt)) {
    return cb(null, true);
  }
  
  // For security, validate that extensions match expected MIME types
  const extensionCategory = Object.values(FILE_TYPES).find(type => 
    type.extensions.includes(fileExt)
  );
  
  if (extensionCategory && !extensionCategory.mimeTypes.includes(mimeType)) {
    logger.warn(`Suspicious file: extension ${fileExt} doesn't match MIME type ${mimeType}`);
    return cb(new Error(`File type mismatch: extension ${fileExt} doesn't match MIME type ${mimeType}`));
  }
  
  cb(new Error(`Unsupported file type: ${mimeType}`));
};

// Configure Multer with storage and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: DEFAULT_MAX_FILE_SIZE
  }
});

/**
 * Get file category based on MIME type
 */
const getFileCategory = (mimeType: string): string => {
  for (const [category, info] of Object.entries(FILE_TYPES)) {
    if (info.mimeTypes.includes(mimeType.toLowerCase())) {
      return category;
    }
  }
  return 'unknown';
};

/**
 * Get max file size for this type
 */
const getMaxSizeForType = (mimeType: string): number => {
  for (const info of Object.values(FILE_TYPES)) {
    if (info.mimeTypes.includes(mimeType.toLowerCase())) {
      return info.maxSize;
    }
  }
  return DEFAULT_MAX_FILE_SIZE;
};

/**
 * IPFS upload middleware for file handling
 */
export const ipfsUpload = {
  /**
   * Configure multer for a specific file type
   */
  configureForType: (
    fieldName: string, 
    fileType: string, 
    customOptions: { maxSize?: number } = {}
  ) => {
    const typeInfo = FILE_TYPES[fileType];
    if (!typeInfo) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    const typeFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      const mimeType = file.mimetype.toLowerCase();
      const fileExt = path.extname(file.originalname).toLowerCase();
      
      if (typeInfo.mimeTypes.includes(mimeType) || typeInfo.extensions.includes(fileExt)) {
        return cb(null, true);
      }
      
      cb(new Error(`Invalid file type. Expected ${fileType} but got ${mimeType}`));
    };
    
    return multer({
      storage,
      fileFilter: typeFilter,
      limits: {
        fileSize: customOptions.maxSize || typeInfo.maxSize
      }
    });
  },
  
  // Middleware for handling single file uploads
  single: (fieldName: string, options: { fileTypes?: string[], maxSize?: number } = {}) => {
    return [
      upload.single(fieldName),
      async (req: Request, res: Response, next: NextFunction) => {
        if (!req.file) {
          return next();
        }
        
        try {
          const filePath = req.file.path;
          const fileBuffer = fs.readFileSync(filePath);
          
          // Upload file to IPFS
          const result = await ipfsService.uploadFile(fileBuffer, {
            fileName: req.file.originalname,
            mimeType: req.file.mimetype
          });
          
          // Add IPFS CID to request
          req.body[`${fieldName}Cid`] = result.cid;
          
          // Create IPFS URL
          const ipfsPath = `ipfs://${result.cid}`;
          req.body[fieldName] = ipfsPath;
          
          // Add file metadata
          req.body[`${fieldName}Metadata`] = {
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            category: getFileCategory(req.file.mimetype),
            cid: result.cid
          };
          
          // Clean up temp file
          fs.unlinkSync(filePath);
          
          logger.info(`File uploaded to IPFS with CID: ${result.cid}`);
          next();
        } catch (error) {
          // Clean up temp file if it exists
          if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          
          if (error instanceof IPFSConnectionError) {
            logger.error('IPFS connection error during file upload:', error);
            return res.status(503).json({ 
              message: 'Storage service is currently unavailable', 
              error: error.message 
            });
          }
          
          if (error instanceof IPFSOperationError) {
            logger.error('IPFS operation error during file upload:', error);
            return res.status(500).json({ 
              message: 'Failed to store file', 
              error: error.message 
            });
          }
          
          logger.error('Error uploading to IPFS:', error);
          return res.status(500).json({ 
            message: 'Failed to upload file',
            error: error.message 
          });
        }
      }
    ];
  },

  // Middleware for handling multiple file uploads
  array: (fieldName: string, maxCount: number = 10, options: { fileTypes?: string[], maxSize?: number } = {}) => {
    return [
      upload.array(fieldName, maxCount),
      async (req: Request, res: Response, next: NextFunction) => {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return next();
        }
        
        try {
          const uploadPromises = (req.files as Express.Multer.File[]).map(async (file) => {
            const filePath = file.path;
            const fileBuffer = fs.readFileSync(filePath);
            
            // Upload to IPFS
            const result = await ipfsService.uploadFile(fileBuffer, {
              fileName: file.originalname,
              mimeType: file.mimetype
            });
            
            // Clean up temp file
            fs.unlinkSync(filePath);
            
            return {
              originalName: file.originalname,
              cid: result.cid,
              ipfsPath: `ipfs://${result.cid}`,
              size: file.size,
              mimeType: file.mimetype,
              category: getFileCategory(file.mimetype)
            };
          });

          const uploadedFiles = await Promise.all(uploadPromises);
          req.body[`${fieldName}Files`] = uploadedFiles;

          logger.info(`${uploadedFiles.length} files uploaded to IPFS`);
          next();
        } catch (error) {
          // Clean up any temp files
          for (const file of req.files as Express.Multer.File[]) {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
          
          if (error instanceof IPFSConnectionError) {
            logger.error('IPFS connection error during multiple file upload:', error);
            return res.status(503).json({ 
              message: 'Storage service is currently unavailable', 
              error: error.message 
            });
          }
          
          if (error instanceof IPFSOperationError) {
            logger.error('IPFS operation error during multiple file upload:', error);
            return res.status(500).json({ 
              message: 'Failed to store files', 
              error: error.message 
            });
          }
          
          logger.error('Error uploading multiple files to IPFS:', error);
          return res.status(500).json({ 
            message: 'Failed to upload files',
            error: error.message 
          });
        }
      }
    ];
  },
  
  // Type-specific upload middlewares
  images: {
    single: (fieldName: string, options = {}) => ipfsUpload.single(fieldName, { fileTypes: ['images'], ...options }),
    array: (fieldName: string, maxCount = 10, options = {}) => ipfsUpload.array(fieldName, maxCount, { fileTypes: ['images'], ...options })
  },
  
  documents: {
    single: (fieldName: string, options = {}) => ipfsUpload.single(fieldName, { fileTypes: ['documents'], ...options }),
    array: (fieldName: string, maxCount = 10, options = {}) => ipfsUpload.array(fieldName, maxCount, { fileTypes: ['documents'], ...options })
  },
  
  json: {
    single: (fieldName: string, options = {}) => ipfsUpload.single(fieldName, { fileTypes: ['json'], ...options }),
    array: (fieldName: string, maxCount = 10, options = {}) => ipfsUpload.array(fieldName, maxCount, { fileTypes: ['json'], ...options })
  },
  
  csv: {
    single: (fieldName: string, options = {}) => ipfsUpload.single(fieldName, { fileTypes: ['csv'], ...options }),
    array: (fieldName: string, maxCount = 10, options = {}) => ipfsUpload.array(fieldName, maxCount, { fileTypes: ['csv'], ...options })
  }
};