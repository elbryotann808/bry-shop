import type { Request, Response, NextFunction } from "express";

type UserPayload = {
  id?: number;
  role?: string;
};

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized. No user found on request — did you forget authMiddleware?",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        error: `Forbidden. Requires role: ${role}`,
      });
    }

    next();
  };
}
