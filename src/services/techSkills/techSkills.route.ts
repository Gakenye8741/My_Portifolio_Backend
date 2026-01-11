import { Router } from "express";
import { 
  getTechSkills, 
  createTechWithSkill, 
  updateTechSkill, 
  deleteTech 
} from "./techSkills.controller";

export const TechSkillsRoute = Router();

TechSkillsRoute.get("/", getTechSkills);
TechSkillsRoute.post("/", createTechWithSkill);
TechSkillsRoute.put("/:id", updateTechSkill);
TechSkillsRoute.delete("/:id", deleteTech);