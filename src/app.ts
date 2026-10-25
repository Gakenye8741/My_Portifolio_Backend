// src/app.ts
import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logger } from "./middlewares/logger";
import authRouter from "./auth/auth.route";
import { ProjectsRoute } from "./services/Project/Project.Route";
import { MediaRoute } from "./services/Media Assets/MediaAssests.Route";
import { ProjectLinkRoute } from "./services/ProjectLinks/ProjectLink.route";
import { ProjectSectionRoute } from "./services/projectSections/ProjectSection.route";
import { ProjectTimelineRoute } from "./services/ProjectTimeline/ProjectTimeline.route";
import { TechSkillsRoute } from "./services/techSkills/techSkills.route";
import { ProjectTechRoute } from "./services/projectTech/projectTech.route";
import { SettingsRoute } from "./services/settings/settings.route";
import { ContentRoute } from "./services/pageContent/pageContent.route";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { ContactRoute, MessagesRoute } from "./services/Contact/Contact.route";
import { PostRoute } from "./services/Post/Post.route";
import { ServiceRoute } from "./services/Services/service.route";
import { TechnologyRoute } from "./services/Technology/technology.route";
import { SkillRoute } from "./services/Skills/skill.route";
import { TestimonialRoute } from "./services/Testimonial/testimonial.route";
import { CertificationRoute } from "./services/Certification/certification.route";
import { FaqRoute } from "./services/FAQ/faq.route";
import { AnalyticsRoute } from "./services/Analytics/analytics.route";

dotenv.config();

const app: Application = express();

// ==========================================
// CORS
// ==========================================
const allowedOrigins = [
  "https://gakenye-ndiritu.co.ke",
  "https://gakenye-ndiritu.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ==========================================
// PARSERS — ORDER MATTERS
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger);

// ==========================================
// ROUTES
// ==========================================
app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to the code with gakenye System BackEnd Project");
});

app.use("/api/auth", authRouter);
app.use("/api/projects", ProjectsRoute);
app.use("/api/media", MediaRoute);
app.use("/api/project-links", ProjectLinkRoute);
app.use("/api/project-sections", ProjectSectionRoute);
app.use("/api/project-timeline", ProjectTimelineRoute);
app.use("/api/tech-skills", TechSkillsRoute);
app.use("/api/project-tech", ProjectTechRoute);
app.use("/api/settings", SettingsRoute);
app.use("/api/content", ContentRoute);
app.use("/api/contact", ContactRoute);
app.use("/api/messages", MessagesRoute);
app.use("/api/posts", PostRoute);
app.use("/api/services", ServiceRoute);
app.use("/api/technologies", TechnologyRoute);
app.use("/api/skills", SkillRoute);
app.use("/api/testimonials", TestimonialRoute);
app.use("/api/certifications", CertificationRoute);
app.use("/api/faqs", FaqRoute);
app.use("/api/analytics", AnalyticsRoute);

// ==========================================
// ERROR HANDLERS — MUST be LAST
// ==========================================
app.use(notFoundHandler);
app.use(errorHandler);

// ❌ DO NOT call app.listen() here.
// ✅ Export the app so server.ts can start it.
export default app;