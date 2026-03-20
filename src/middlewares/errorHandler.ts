/**
 * GLOBAL ERROR HANDLER FOR ALL ERROR CATCHING
 */

import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import multer from "multer";

function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let details: any = null;

  if (statusCode === 500) {
    console.error("🛑 SERVER ERROR:", err);
  }

  // ================================
  // Prisma Validation Error
  // ================================
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid request data";
    details =
      process.env.NODE_ENV === "development"
        ? err.message
        : "Validation failed";
  }

  // ================================
  // Prisma Known Request Errors
  // ================================
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        statusCode = 409;
        message = "Duplicate value violates unique constraint";
        details = err.meta?.target ? `Field: ${err.meta.target}` : null;
        break;

      case "P2025":
        statusCode = 404;
        message = "Requested record not found";
        break;

      case "P2003":
        statusCode = 400;
        message = "Invalid reference (Foreign Key Constraint)";
        details = err.meta?.field_name
          ? `Invalid ID in: ${err.meta.field_name}`
          : null;
        break;

      default:
        statusCode = 400;
        message = "Database request error";

        details = process.env.NODE_ENV === "development" ? err.meta : null;
    }
  }

  // ================================
  // Prisma Unknown/Rust/Init Errors
  // ================================
  else if (
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError
  ) {
    statusCode = 500;
    message = "Database connection or internal error";
    details = null;
    console.error("🔥 CRITICAL DB ERROR:", err);
  }

  // ================================
  // Multer Errors
  // ================================
  else if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 400;
      message = "File is too large. Maximum limit is 5MB.";
    }
  }

  // ================================
  // Send Error Response
  // ================================
  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

export { errorHandler };
