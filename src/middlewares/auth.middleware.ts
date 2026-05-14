import { Request, Response, NextFunction } from "express";
import { User } from "@/models/User";
import { verifyToken } from "@/services/jwt";
import { ApiError } from "@/utils/ApiError";

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) return next(ApiError.unauthorized("No token, authorization denied"));

    const decoded = await verifyToken(token);
    if (!decoded) return next(ApiError.unauthorized("Token is not valid"));

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return next(ApiError.unauthorized("User not found"));

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.userId).select("-password");
    req.user = user;
  } catch {
    req.user = null;
  }
  next();
};

export const adminMiddleware = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.user) return next(ApiError.unauthorized("Authentication required"));
  if (req.user.role !== "admin") return next(ApiError.forbidden("Admin access required"));
  next();
};