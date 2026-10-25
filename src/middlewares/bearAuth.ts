import { NextFunction, Request, Response } from "express";
import { getSessionWithUserService, TPublicUser } from "../auth/auth.service";


// Extend Express Request with our public user
declare global {
  namespace Express {
    interface Request {
      user?: TPublicUser;
    }
  }
}

// ==========================================
// requireAuth — any logged-in user
// ==========================================
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.session as string | undefined;

    if (!sessionId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const ctx = await getSessionWithUserService(sessionId);

    if (!ctx) {
      res.clearCookie("session", { path: "/" });
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    req.user = ctx.user;
    next();
  } catch (err) {
    next(err);
  }
};

// ==========================================
// requireAdmin — must be logged in AND isAdmin
// ==========================================
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.session as string | undefined;

    if (!sessionId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const ctx = await getSessionWithUserService(sessionId);

    if (!ctx) {
      res.clearCookie("session", { path: "/" });
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    if (!ctx.user.isAdmin) {
      res.status(403).json({
        error: "Forbidden: admin access required",
      });
      return;
    }

    req.user = ctx.user;
    next();
  } catch (err) {
    next(err);
  }
};