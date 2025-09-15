import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { 
  createUserServices, 
  getAllUsersServices, 
  getUserByIdServices, 
  updateUserServices 
} from "./users.service";

// =======================
// GET ALL USERS
// =======================
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await getAllUsersServices();
    if (!allUsers || allUsers.length === 0) {
       res.status(404).json({ error: "No users found" });
       return;
    }
    res.status(200).json(allUsers);
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
    return;
  }
};

// =======================
// GET USER BY NATIONAL ID
// =======================
export const getUserByid = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid userID" });
    return;
  }

  try {
    const user = await getUserByIdServices(id);
    if (!user) { 
      res.status(404).json({ message: "No user with that National ID was found" });
      return;
    } else {
      res.status(200).json(user);
      return;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
    return;
  }
};

// =======================
// CREATE USER
// =======================
export const createUser = async (req: Request, res: Response) => {
  const { username, fullName, email, password, role } = req.body;

  if (!username || !fullName || !email || !password || !role) {
   res.status(400).json({ error: "All fields are required!" });
   return;
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const createdUser = await createUserServices({
      username,
      fullName,
      email,
      password: hashedPassword,
      role,
      isActive: true, // default active
    });

    res.status(201).json({ message: createdUser });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
    return;
  }
};

// =======================
// TOGGLE USER STATUS (DISABLE/ENABLE)
// =======================
export const toggleUserStatus = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Please enter a valid ID" });
    return;
  }

  try {
    const user = await getUserByIdServices(id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const newStatus = !user.isActive;
    const result = await updateUserServices(id, { isActive: newStatus });

    res.status(200).json({ 
      message: `User is now ${newStatus ? "enabled" : "disabled"}`, 
      isActive: newStatus 
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
    return;
  }
};

// =======================
// UPDATE USER
// =======================
// =======================
// UPDATE USER
// =======================
export const updateUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Enter a valid national ID" });
    return;
  }

  const { fullName, password, contactPhone, address, role, isActive } = req.body;

  const updates: Partial<any> = {};

  if (fullName !== undefined) updates.fullName = fullName;
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    updates.password = hashedPassword;
  }

  if (role !== undefined) {
    const validRoles = ["Secretary General", "Chairman"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: "Invalid role. Must be Secretary General or Chairman" });
      return;
    }
    updates.role = role;
  }

  // ✅ Allow updating isActive
  if (isActive !== undefined) updates.isActive = isActive;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided for update" });
    return;
  }

  try {
    const result = await updateUserServices(id, updates);
    res.status(200).json({ message: result, updatedFields: updates });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

