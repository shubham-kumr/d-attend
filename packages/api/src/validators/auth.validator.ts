import { body } from 'express-validator';
import { ethers } from 'ethers';

export const signatureValidator = [
  body('address')
    .notEmpty().withMessage('Wallet address is required')
    .custom(value => {
      if (!ethers.utils.isAddress(value)) {
        throw new Error('Invalid Ethereum address');
      }
      return true;
    }),
  body('signature')
    .notEmpty().withMessage('Signature is required')
    .isString().withMessage('Signature must be a string'),
];

export const profileUpdateValidator = [
  body('name')
    .optional()
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Email must be a valid email address')
    .normalizeEmail(),
  body('profilePicture')
    .optional()
    .isURL().withMessage('Profile picture must be a valid URL'),
];