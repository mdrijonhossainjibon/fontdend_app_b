import { Request, Response, NextFunction } from "express";
import { User } from "@/models/User";
import { ResellerApiKey } from "@/models/ResellerApiKey";
import { verifyToken } from "@/services/jwt";
import { ApiError } from "@/utils/ApiError";

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) return next(ApiError.unauthorized("No token, authorization denied"));

    // Reseller API key auth (rk_live_ prefix)
    if (token.startsWith('rk_live_')) {
      const apiKey = await ResellerApiKey.findOne({ key: token, isActive: true });
      if (!apiKey) return next(ApiError.unauthorized("Invalid or inactive API key"));

      const user = await User.findById(apiKey.resellerId).select("-password");
      if (!user) return next(ApiError.unauthorized("Reseller user not found"));

      // Update usage
      await ResellerApiKey.updateOne(
        { _id: apiKey._id },
        { $inc: { usageCount: 1 }, lastUsedAt: new Date() }
      );

      req.user = user;
      return next();
    }

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
  if (!['admin', 'superadmin'].includes(req.user.role)) return next(ApiError.forbidden("Admin access required"));
  next();
};

export const resellerMiddleware = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.user) return next(ApiError.unauthorized("Authentication required"));
  if (!['reseller', 'admin', 'superadmin'].includes(req.user.role)) {
    return next(ApiError.forbidden("Reseller/Admin access required"));
  }
  next();
};