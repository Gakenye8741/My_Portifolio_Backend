import { RequestHandler } from "express";
import {
  getAllTechSkillsService,
  createTechWithSkillService,
  updateTechSkillService,
  deleteTechService,
} from "./techSkills.service";

/**
 * ✅ GET All Tech & Skills
 * Query param: ?category=frontend
 */
export const getTechSkills: RequestHandler = async (req, res) => {
  try {
    const { category } = req.query;
    const data = await getAllTechSkillsService(category as string);
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch tech stack", details: error.message });
  }
};

/**
 * ✅ POST Create Tech + Skill
 * Expects: { techData: {...}, skillData: { proficiency, yearsExperience } }
 */
export const createTechWithSkill: RequestHandler = async (req, res) => {
  try {
    const { techData, skillData } = req.body;
    
    if (!techData || !skillData) {
       res.status(400).json({ error: "Missing techData or skillData in request body" });
       return;
    }

    const newEntry = await createTechWithSkillService(techData, skillData);
    res.status(201).json(newEntry);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create technology entry", details: error.message });
  }
};

/**
 * ✅ PUT Update Tech & Skill
 * Expects: { techUpdates: {...}, skillUpdates: {...} }
 */
export const updateTechSkill: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTechSkillService(id, req.body);

    if (!updated) {
      res.status(404).json({ error: "Technology not found" });
      return;
    }

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update technology entry", details: error.message });
  }
};

/**
 * ✅ DELETE Technology
 */
export const deleteTech: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTechService(id);
    res.status(200).json({ message: "Technology and associated skills deleted ❌" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete technology", details: error.message });
  }
};