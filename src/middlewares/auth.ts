import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import {
  sendError,
  sendForbidden,
  sendUnauthorized,
} from "../helpers/sendResponse.js";

export type UserRole = "USER" | "ORGANIZER" | "ADMIN";

/**
 * Extend Express Request to carry user & session data.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        emailVerified: boolean;
      };
      session?: typeof auth.$Infer.Session.session;
    }
  }
}

/**
 * Requires a valid BetterAuth session. Returns 401 if missing.
 */
const authMiddleware = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers as any,
      });

      if (!session || !session.user) {
        return sendUnauthorized(res, "Unauthorized");
      }
      // if (!session.user.emailVerified) {
      //   return sendUnauthorized(res, "Email not verified");
      // }

      const user = session.user as any;

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        emailVerified: user.emailVerified,
      };

      //role based
      if (roles.length && !roles.includes(req.user.role)) {
        return sendForbidden(res, "Forbidden");
      }
      next();
    } catch (error) {
      return sendError(
        res,
        "Authentication failed",
        500,
        (error as Error).message,
      );
    }
  };
};

export default authMiddleware;

/**
 * Optionally attaches user if a session exists, but does NOT block.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session) {
      const user = session.user as any;
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        emailVerified: user.emailVerified,
      };
      req.session = session.session;
    }

    next();
  } catch {
    // silently proceed without auth
    next();
  }
};
