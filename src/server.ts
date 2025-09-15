import express, { Application }  from "express";
import dotenv from 'dotenv';
import { logger } from "./middlewares/logger";
import authRouter from "./auth/auth.route";
import cors from 'cors';
import userRouter from "./services/users/users.routes";
import meetingRouter from "./services/others/others.route";
import attendeesRouter from "./services/Attendees/Attendee.route";
import topicsRouter from "./services/Topics/Topics.route";
import signaturesRouter from "./services/Signatres/signature.route";


dotenv.config();

const PORT = process.env.PORT || 5000


const app:Application = express()

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(logger)


// Routes
app.use('/api/auth',authRouter);
app.use('/api/Users', userRouter);
app.use('/api/Meetings', meetingRouter);
app.use('/api/Topics', topicsRouter);
app.use('/api/Signatures',signaturesRouter);
app.use('/api/Attendees',attendeesRouter);

// Default Message
app.get('/',(req,res)=>{
   res.send('Welcome to the Meeting Minutes  Management System BackEnd Project')
})

app.listen(PORT,()=>{
    console.log(`App is running on http://localhost:${PORT}`);
})