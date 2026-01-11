import { RequestHandler } from "express";
import {
  getLinksByProjectIdService,
  createProjectLinkService,
  syncProjectLinksService,
  updateProjectLinkService,
  deleteProjectLinkService,
} from "./ProjectLinks.service";

// ✅ Get all links for a project
export const getProjectLinks: RequestHandler = async (req, res) => {
  try {
    // Explicitly cast to string for type safety
    const projectId = req.params.projectId as string;
    const links = await getLinksByProjectIdService(projectId);
    res.status(200).json(links);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project links" });
  }
};

// ✅ Create a single link
export const createLink: RequestHandler = async (req, res) => {
  try {
    const newLink = await createProjectLinkService(req.body);
    res.status(201).json(newLink);
  } catch (error) {
    res.status(500).json({ error: "Failed to add link" });
  }
};

// ✅ Bulk Sync Links (Replace all links for a project)
export const syncLinks: RequestHandler = async (req, res) => {
  try {
    // Explicitly cast to string for type safety
    const projectId = req.params.projectId as string;
    // req.body should be an array of links
    const message = await syncProjectLinksService(projectId, req.body);
    res.status(200).json({ message });
  } catch (error) {
    console.error("Sync Error:", error);
    res.status(500).json({ error: "Failed to synchronize links" });
  }
};

// ✅ Update a link
export const updateLink: RequestHandler = async (req, res) => {
  try {
    // Explicitly cast to string for type safety
    const id = req.params.id as string;
    const updated = await updateProjectLinkService(id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update link" });
  }
};

// ✅ Delete a link
export const deleteLink: RequestHandler = async (req, res) => {
  try {
    // Explicitly cast to string for type safety
    const id = req.params.id as string;
    const message = await deleteProjectLinkService(id);
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove link" });
  }
};