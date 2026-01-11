import { RequestHandler } from "express";
import {
  getTechsByProjectService,
  addTechsToProjectService,
  removeTechFromProjectService,
  syncProjectTechsService,
} from "./projectTech.service";

/**
 * ✅ GET all technologies for a specific project
 */
export const getProjectTechs: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const techs = await getTechsByProjectService(projectId);
    res.status(200).json(techs);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch project technologies", details: error.message });
  }
};

/**
 * ✅ POST link technologies to a project
 * Expects: { technologyIds: ["uuid1", "uuid2"] }
 */
export const addTechsToProject: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { technologyIds } = req.body;

    if (!Array.isArray(technologyIds)) {
       res.status(400).json({ error: "technologyIds must be an array" });
       return;
    }

    const links = await addTechsToProjectService(projectId, technologyIds);
    res.status(201).json(links);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to link technologies", details: error.message });
  }
};

/**
 * ✅ PUT Sync Technologies (The Clean-and-Replace method)
 * Expects: { technologyIds: ["uuid1", "uuid2"] }
 */
export const syncProjectTechs: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { technologyIds } = req.body;

    const message = await syncProjectTechsService(projectId, technologyIds);
    res.status(200).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to sync project technologies", details: error.message });
  }
};

/**
 * ✅ DELETE a specific technology link
 */
export const removeTechFromProject: RequestHandler = async (req, res) => {
  try {
    const { projectId, technologyId } = req.params;
    const message = await removeTechFromProjectService(projectId, technologyId);
    res.status(200).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to unlink technology", details: error.message });
  }
};