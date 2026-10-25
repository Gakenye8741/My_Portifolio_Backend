import { Request, Response, NextFunction } from "express";
import {
  registerUserService,
  loginUserService,
  createSessionService,
  deleteSessionService,
  getSessionWithUserService,
} from "./auth.service";

// ✅ Register User
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, password } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
    };

    if (!fullName || !email || !password) {
      res.status(400).json({ error: "Full name, email, and password are required" });
      return;
    }

    // service hashes the password internally, checks duplicates, returns safe user
    const user = await registerUserService({ fullName, email, password });

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    next(err); // handled by central error middleware
  }
};

// ✅ Login
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // service verifies password against hash, throws generic error on failure
    const user = await loginUserService({ email, password });

    // create a session row + set httpOnly cookie
    const { sessionId, expiresAt } = await createSessionService(user.id, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.cookie("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// ✅ Logout
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.session as string | undefined;
    if (sessionId) await deleteSessionService(sessionId);

    res.clearCookie("session", { path: "/" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// ✅ Me (current user)
export const getCurrentUser = async (
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
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    res.status(200).json({ user: ctx.user });
  } catch (err) {
    next(err);
  }
};