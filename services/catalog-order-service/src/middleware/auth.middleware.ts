/* eslint-disable */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

const JWT_SECRET = process.env.JWT_SECRET;

type JwtAny = { sub?: string | number; id?: string | number; userId?: string | number; email?: string; role?: string; [k: string]: any };

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = String(req.headers.authorization);
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const token = header.split(" ")[1];
    // @ts-ignore
    const payload = jwt.verify(token, JWT_SECRET) as JwtAny;

    
    const rawId = payload.id ?? payload.sub ?? payload.userId ?? (payload as any).user_id;
    const id = rawId === undefined ? undefined : Number(rawId);

    (req as any).user = {
    id: Number.isFinite(id) ? id : undefined,
    email: payload.email,
    role: payload.role,
    _raw: payload,
    };
    return next();
  } catch (err) {
    console.error("authMiddleware error:", (err as any)?.message ?? err);
    return res.status(401).json({ error: "Invalid token" });
  }
}
