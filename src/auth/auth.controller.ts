
import { Request,Response } from "express"
import bcrypt from  "bcrypt"
import { getUserByEmail, RegisterUserServices } from "./auth.service";
import jwt from "jsonwebtoken"
export const registerUser = async (req:Request, res:Response) =>  {
    try {
        const user = req.body;
            if(!user.username || !user.fullName  || !user.password || !user.email || !user.role){
            res.status(404).json({error: "All Fields Are Required!!"});
            return;
        }
        console.log(user);
        // HAshing Password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(user.password,salt);

        // console.log(hashedPassword);
        user.password = hashedPassword;

        const newUser =  await RegisterUserServices(user);
        if(!user){
            res.status(400).json({error: "User not registered Error  Occured!!"});
        }else{
            res.status(200).json({message: user});
        }
    } catch (error:any) {
        res.status(500).json({error: error.message || "Error occured try again!"});
    }
}

// Login Logic
export const loginUser = async (req:Request,res:Response) =>  {
 try {
    const user  = req.body;

 const existingUser = await getUserByEmail(user.email);
 if(!existingUser){
    res.status(404).json({error: "No User Found!!"});
    return;
 }

 //  compare passwords
 const isMatch = bcrypt.compareSync(user.password,existingUser.password);
 if(!isMatch){
    res.status(404).json({error: "Invalid Password!!"});
 }

 //  generating  token
 const payload = {
    username: existingUser.username,
    userId: existingUser.id,
    fullName:  existingUser.fullName,
    email: existingUser.email,
    role:existingUser.role,
    createdAt: existingUser.createdAt,
    // Token Expiration
    exp: Math.floor(Date.now()/1000) +  (60*60)
 }

 let secret = process.env.JWT_SECRET as string;

 let token =   jwt.sign(payload,secret);

 res.status(200).json({token,username:existingUser.username, userId: existingUser.id,fullName: existingUser.fullName,email:existingUser.email,role: existingUser.role,createdAt: existingUser.createdAt})
 } catch (error:any) {
    res.status(400).json({error: error.message || "Error Occured Try Again"});
 }
}