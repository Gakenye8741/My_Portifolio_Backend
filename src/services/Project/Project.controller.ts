import { RequestHandler } from "express";
import {
  getAllProjectsService,
  getProjectByIdService,
  getProjectBySlugService,
  getProjectWithThumbnailService,
  createProjectService,
  updateProjectService,
  deleteProjectService,
  incrementProjectViewService,
} from "./Project.service"

// ✅ Get all projects
export const getAllProjects: RequestHandler = async (req, res) => {
  try {
    const projects = await getAllProjectsService();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

// ✅ Get a project by ID
export const getProjectById: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id; // It's already a string (UUID)
    
    // Optional: Basic length check for UUID (standard UUID is 36 chars)
    if (!id || id.length < 30) {
      res.status(400).json({ error: "Invalid project ID format" });
      return;
    }

    const project = await getProjectByIdService(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
};

// ✅ Get project by Slug
export const getProjectBySlug: RequestHandler = async (req, res) => {
  try {
    const slug = req.params.slug;
    const project = await getProjectBySlugService(slug);
    
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Increment views using the UUID string
    await incrementProjectViewService(project.id);

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project by slug" });
  }
};

// ✅ Get project with thumbnail details
export const getProjectWithThumbnail: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id; 

    const project = await getProjectWithThumbnailService(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project details" });
  }
};

// ✅ Create a new project
export const createProject: RequestHandler = async (req, res) => {
  try {
    const message = await createProjectService(req.body);
    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: "Failed to create project" });
  }
};

// ✅ Update a project
export const updateProject: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;

    const message = await updateProjectService(id, req.body);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: "Failed to update project" });
  }
};

// ✅ Delete a project
export const deleteProject: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;

    const message = await deleteProjectService(id);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete project" });
  }
};