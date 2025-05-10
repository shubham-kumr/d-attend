import { Response } from 'express';

/**
 * Standard success response
 */
export const successResponse = (
  res: Response,
  data: any = {},
  message: string = 'Success',
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

/**
 * Standard error response
 */
export const errorResponse = (
  res: Response,
  message: string = 'Error',
  statusCode: number = 500,
  errors: any = {}
) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    errors,
  });
};

/**
 * Pagination response helper
 */
export const paginatedResponse = (
  res: Response,
  data: any[],
  page: number,
  limit: number,
  totalItems: number,
  message: string = 'Success'
) => {
  const totalPages = Math.ceil(totalItems / limit);
  
  return res.status(200).json({
    status: 'success',
    message,
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};