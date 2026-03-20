/**
 * Response Manager for standardized API responses
 */

import type { Response } from "express";

export const sendCreated = (
  res: Response,
  data: any,
  message: string = "Resource created successfully",
  statusCode: number = 201,
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// success
export const sendSuccess = (
  res: Response,
  result: { data: any; meta?: any },
  message: string = "Success",
  statusCode: number = 200,
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: result.data,
    meta: result.meta,
  });
};

// error
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string,
) => {
  const response: any = {
    success: false,
    message,
  };

  if (error) {
    response.error = error;
  }

  res.status(statusCode).json(response);
};

// unauthorized
export const sendUnauthorized = (
  res: Response,
  message: string = "Unauthorized",
) => {
  sendError(res, message, 401);
};

// forbidden
export const sendForbidden = (res: Response, message: string = "Forbidden") => {
  sendError(res, message, 403);
};
