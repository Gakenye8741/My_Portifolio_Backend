import { Router } from "express";
import { createUser, getAllUsers, getUserByid, updateUser, toggleUserStatus } from "./users.controller";

const userRouter = Router();

// Get all users
userRouter.get('/AllUsers', getAllUsers);

// Get user by ID
userRouter.get('/UserByid/:id', getUserByid);

// Create user
userRouter.post('/CreateUser', createUser);

// Update user
userRouter.put('/UpdateUser/:id', updateUser);

// Toggle user status (enable/disable)
userRouter.put('/ToggleStatus/:id', toggleUserStatus);

export default userRouter;
