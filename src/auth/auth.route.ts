import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from "./auth.controller";

const authRouter = Router();

// Register new user
authRouter.post("/register", registerUser);

// Login (sets session cookie)
authRouter.post("/login", loginUser);

// Logout (clears session cookie)
authRouter.post("/logout", logoutUser);

// Get current user (from session cookie)
authRouter.get("/me", getCurrentUser);

export default authRouter;