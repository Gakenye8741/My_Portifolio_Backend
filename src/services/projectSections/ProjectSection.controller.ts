import { RequestHandler } from "express";
import {
  createSectionService,
  getSectionsByProjectService,
  reorderSectionsService,
  updateSectionService,
  deleteSectionService,
} from "./projectSections.service";

// ✅ Add a new section (Problem, Solution, etc.)
export const createSection: RequestHandler = async (req, res) => {
  try {
    const newSection = await createSectionService(req.body);
    res.status(201).json(newSection);
  } catch (error) {
    res.status(500).json({ error: "Failed to create project section" });
  }
};

// ✅ Get all sections for a specific project
export const getProjectSections: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const sections = await getSectionsByProjectService(projectId);
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sections" });
  }
};

// ✅ Reorder multiple sections at once
// Expects body: [{ id: "uuid", order: 1 }, { id: "uuid", order: 2 }]
export const reorderSections: RequestHandler = async (req, res) => {
  try {
    const message = await reorderSectionsService(req.body);
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ error: "Failed to reorder sections" });
  }
};

// ✅ Update specific section content
export const updateSection: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateSectionService(id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Section not found" });
      return;
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update section" });
  }
};

// ✅ Delete a section
export const deleteSection: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await deleteSectionService(id);
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete section" });
  }
};