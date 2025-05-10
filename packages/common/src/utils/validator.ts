import { body } from 'express-validator';

export const validateServer = [
  body('name').notEmpty().withMessage('Name is required'),
  body('description').optional().isString(),
  body('location').optional().isString(),
];

export const validateCredential = [
  body('recipientAddress').isEthereumAddress().withMessage('Invalid wallet address'),
  body('metadataUri').notEmpty().withMessage('Metadata URI is required'),
  body('credentialType').notEmpty().withMessage('Credential type is required'),
  body('expiryTime').optional().isInt({ min: 0 }).withMessage('Expiry time must be a positive number'),
];