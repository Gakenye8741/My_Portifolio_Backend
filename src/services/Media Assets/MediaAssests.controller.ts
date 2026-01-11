import { RequestHandler } from "express";
import {
  createMediaService,
  getAllMediaService,
  getMediaByIdService,
  deleteMediaService,
  updateMediaService,
} from "./MediaAssests.service";

// ✅ Upload/Create Media Asset
export const createMedia: RequestHandler = async (req, res) => {
  try {
    const newAsset = await createMediaService(req.body);
    res.status(201).json(newAsset);
  } catch (error) {
    console.error("Create Media Error:", error);
    res.status(500).json({ error: "Failed to create media asset" });
  }
};

// ✅ Get All Media Assets
export const getAllMedia: RequestHandler = async (req, res) => {
  try {
    const assets = await getAllMediaService();
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media assets" });
  }
};

// ✅ Get Single Media by ID
export const getMediaById: RequestHandler = async (req, res) => {
  try {
    // Fix: Explicitly cast the ID param to string for TS compiler
    const id = req.params.id as string; 
    const asset = await getMediaByIdService(id);

    if (!asset) {
      res.status(404).json({ error: "Media asset not found" });
      return;
    }

    res.status(200).json(asset);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media asset" });
  }
};

// ✅ Update Media Metadata
export const updateMedia: RequestHandler = async (req, res) => {
  try {
    // Fix: Explicitly cast the ID param to string
    const id = req.params.id as string;
    const updated = await updateMediaService(id, req.body);
    res.status(200).json({ message: "Media updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update media asset" });
  }
};

// ✅ Delete Media Asset
export const deleteMedia: RequestHandler = async (req, res) => {
  try {
    // Fix: Explicitly cast the ID param to string
    const id = req.params.id as string;
    const result = await deleteMediaService(id);

    if (!result.success) {
      // 400 Bad Request if the image is being used by a project
      res.status(400).json({ error: result.message });
      return;
    }

    res.status(200).json({ message: result.message });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete media asset" });
  }
};