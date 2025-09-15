import { Router } from "express";
import { loginUser, registerUser } from "./auth.controller";


const authRouter = Router();

// register User
authRouter.post('/register',registerUser);
authRouter.post('/login',loginUser);

export default authRouter;