import express, { Application }  from "express";
import dotenv from 'dotenv';
import { logger } from "./middlewares/logger";
import authRouter from "./auth/auth.route";
import cors from 'cors';
import { ProjectsRoute } from "./services/Project/Project.Route";
import { MediaRoute } from "./services/Media Assets/MediaAssests.Route";
import { ProjectLinkRoute } from "./services/ProjectLinks/ProjectLink.route";
import { ProjectSectionRoute } from "./services/projectSections/ProjectSection.route";
import { ProjectTimelineRoute } from "./services/ProjectTimeline/ProjectTimeline.route";
import { TechSkillsRoute } from "./services/techSkills/techSkills.route";
import { ServiceRoute } from "./services/Services & Tech Service/services.route";
import { ProjectTechRoute } from "./services/projectTech/projectTech.route";
import { SettingsRoute } from "./services/settings/settings.route";
import { ContentRoute } from "./services/pageContent/pageContent.route";



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
app.use('/api/projects', ProjectsRoute);
app.use('/api/media', MediaRoute);
app.use('/api/project-links', ProjectLinkRoute);
app.use('/api/project-sections', ProjectSectionRoute);
app.use('/api/project-timeline', ProjectTimelineRoute);
app.use('/api/tech-skills', TechSkillsRoute);
app.use('/api/services', ServiceRoute);
app.use('/api/project-tech', ProjectTechRoute);
app.use('/api/settings', SettingsRoute);
app.use('/api/content', ContentRoute);

// Default Message
app.get('/',(req,res)=>{
   res.send('Welcome to the code with gakenye System BackEnd Project')
})

app.listen(PORT,()=>{
    console.log(`Portifolio App is running on http://localhost:${PORT}`);
})