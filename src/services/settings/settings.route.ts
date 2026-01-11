import { Router } from "express";
import {
  getSettings,
  getSettingByKey,
  upsertSetting,
  bulkSaveSettings,
  deleteSetting
} from "./settings.controller";

export const SettingsRoute = Router();

// GET all or filter by ?category=...
SettingsRoute.get("/", getSettings);

// GET specific key value
SettingsRoute.get("/key/:key", getSettingByKey);

// Single Upsert
SettingsRoute.post("/", upsertSetting);

// Bulk Upsert (Save entire page)
SettingsRoute.post("/bulk", bulkSaveSettings);

// Delete by key
SettingsRoute.delete("/:key", deleteSetting);