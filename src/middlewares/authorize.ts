import type { Request, Response, NextFunction } from "express";
import {
  sendUnauthorized,
  sendForbidden,
} from "../helpers/sendResponse.js";

/**
 * Role-based access guard. Must be used AFTER `authMiddleware`.
 *
 * ```ts
 * router.post("/courts", authMiddleware(), authorize("ORGANIZER", "ADMIN"), controller);
 * ```
 */
const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      sendUnauthorized(res, "Authentication required");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      sendForbidden(
        res,
        `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
      );
      return;
    }

    next();
  };
};

export default authorize;
