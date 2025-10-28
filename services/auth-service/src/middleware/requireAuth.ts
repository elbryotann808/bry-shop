import type { Request, Response, NextFunction } from "express"
import { verifyJwt } from "../services/jwt.service.js"

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = String(req.headers.authorization ?? "");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({message: "Autorization token missing"}) 
    }

    const parts = authHeader.split(" ")
    const token = parts[1];
    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" })
    }
    
    const payload = verifyJwt(token); 

    (req as unknown as { user?: typeof payload }).user = payload;

    return next();
  } catch (error) {
    console.error(error)
    return res.status(401).json({ message: "Invalid or expired token"})
  }
}