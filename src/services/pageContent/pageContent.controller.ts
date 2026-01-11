import { RequestHandler } from "express";
import {
  getPageContentService,
  getContentByKeyService,
  upsertContentWithGalleryService,
  deletePageContentService,
} from "./pageContent.service";

/**
 * ✅ GET All Content for a Page
 * Usage: GET /api/content/page/home
 */
export const getPageContent: RequestHandler = async (req, res) => {
  try {
    // Cast the specific param to string
    const pageName = req.params.pageName as string;
    const content = await getPageContentService(pageName);
    
    res.status(200).json(content);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch page content", 
      details: error.message 
    });
  }
};

/**
 * ✅ GET Single Content Block by Key
 * Usage: GET /api/content/key/hero_section
 */
export const getContentByKey: RequestHandler = async (req, res) => {
  try {
    // Cast the specific param to string
    const key = req.params.key as string;
    const content = await getContentByKeyService(key);
    
    if (!content) {
      res.status(404).json({ error: "Content block not found" });
      return;
    }
    
    res.status(200).json(content);
  } catch (error: any) {
    res.status(500).json({ error: "Error fetching content", details: error.message });
  }
};

/**
 * ✅ POST/PUT Upsert Content Block with Gallery
 * Expects: { contentData: { page, section, key, title, value }, mediaIds: ["uuid1", "uuid2"] }
 */
export const savePageContent: RequestHandler = async (req, res) => {
  try {
    const { contentData, mediaIds = [] } = req.body;

    if (!contentData || !contentData.key || !contentData.page) {
      res.status(400).json({ error: "Missing required fields: key and page are required." });
      return;
    }

    const result = await upsertContentWithGalleryService(contentData, mediaIds);
    res.status(200).json({
      message: "Content saved successfully ✅",
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to save content", 
      details: error.message 
    });
  }
};

/**
 * ✅ DELETE Content Block
 * Usage: DELETE /api/content/uuid-here
 */
export const deleteContent: RequestHandler = async (req, res) => {
  try {
    // Cast the specific param to string
    const id = req.params.id as string;
    const message = await deletePageContentService(id);
    res.status(200).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete content", details: error.message });
  }
};