import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express route handler so rejected promises are forwarded
 * to the global error handler automatically.
 */
type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

const catchAsync =
  (fn: AsyncController) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default catchAsync;
