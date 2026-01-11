import { Router } from "express";
import {
  getPageContent,
  getContentByKey,
  savePageContent,
  deleteContent
} from "./pageContent.controller";

export const ContentRoute = Router();

// Retrieve content
ContentRoute.get("/page/:pageName", getPageContent);
ContentRoute.get("/key/:key", getContentByKey);

// Create or Update (Upsert)
ContentRoute.post("/", savePageContent);

// Delete
ContentRoute.delete("/:id", deleteContent);