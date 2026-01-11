import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getUserByEmailService, registerUserService } from "./auth.service";

// ✅ Register User
export const registerUser = async (req: Request, res: Response) => {
  try {
    const user = req.body;

    // Check for required fields based on your schema
    if (!user.fullName || !user.password || !user.email) {
      res.status(400).json({ error: "Full Name, Email, and Password are required!" });
      return;
    }

    // Check if user already exists
    const existingUser = await getUserByEmailService(user.email);
    if (existingUser) {
      res.status(400).json({ error: "Email is already registered!" });
      return;
    }

    // Hashing Password
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(user.password, salt);

    const message = await registerUserService(user);
    res.status(201).json({ message });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred during registration" });
  }
};

// ✅ Login Logic
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required!" });
      return;
    }

    const existingUser = await getUserByEmailService(email);
    if (!existingUser) {
      res.status(404).json({ error: "User not found!" });
      return;
    }

    // Compare passwords
    const isMatch = bcrypt.compareSync(password, existingUser.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials!" });
      return;
    }

    // generating token payload matching your DecodedToken type
    const payload = {
      id: existingUser.id,
      fullName: existingUser.fullName,
      email: existingUser.email,
      role: existingUser.role, // "admin"
      // exp is handled by jwt.sign option usually, but manually adding here:
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    };

    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const token = jwt.sign(payload, secret);

    res.status(200).json({
      token,
      user: {
        id: existingUser.id,
        fullName: existingUser.fullName,
        email: existingUser.email,
        role: existingUser.role,
        createdAt: existingUser.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};