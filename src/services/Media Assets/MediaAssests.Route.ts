import { Router } from "express";
import { 
  createMedia, 
  getAllMedia, 
  getMediaById, 
  updateMedia, 
  deleteMedia 
} from "./MediaAssests.controller";

export const MediaRoute = Router();

MediaRoute.post("/", createMedia);
MediaRoute.get("/", getAllMedia);
MediaRoute.get("/:id", getMediaById);
MediaRoute.put("/:id", updateMedia);
MediaRoute.delete("/:id", deleteMedia);