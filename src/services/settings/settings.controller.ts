import { RequestHandler } from "express";
import {
  getAllSettingsService,
  getSettingsByCategoryService,
  getSettingValueService,
  upsertSettingService,
  bulkUpsertSettingsService,
  deleteSettingService,
} from "./settings.service";

/**
 * ✅ GET All Settings
 * Optional Query: ?category=seo
 */
export const getSettings: RequestHandler = async (req, res) => {
  try {
    const { category } = req.query;
    let data;

    if (category) {
      data = await getSettingsByCategoryService(category as string);
    } else {
      data = await getAllSettingsService();
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch settings", details: error.message });
  }
};

/**
 * ✅ GET Single Setting Value by Key
 * Used for specific lookups like 'site_name'
 */
export const getSettingByKey: RequestHandler = async (req, res) => {
  try {
    // Cast param to string for type safety
    const key = req.params.key as string;
    const value = await getSettingValueService(key);
    res.status(200).json({ key, value });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch setting", details: error.message });
  }
};

/**
 * ✅ POST/PUT Upsert Single Setting
 * Logic: If key exists, update value. If not, create it.
 */
export const upsertSetting: RequestHandler = async (req, res) => {
  try {
    const result = await upsertSettingService(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save setting", details: error.message });
  }
};

/**
 * ✅ POST Bulk Upsert Settings
 * Expects: Array of { key: string, value: string, category: string }
 */
export const bulkSaveSettings: RequestHandler = async (req, res) => {
  try {
    const settingsArray = req.body;

    if (!Array.isArray(settingsArray)) {
      res.status(400).json({ error: "Body must be an array of settings" });
      return;
    }

    const results = await bulkUpsertSettingsService(settingsArray);
    res.status(200).json(results);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to bulk save settings", details: error.message });
  }
};

/**
 * ✅ DELETE Setting
 */
export const deleteSetting: RequestHandler = async (req, res) => {
  try {
    // Cast param to string for type safety
    const key = req.params.key as string;
    const message = await deleteSettingService(key);
    res.status(200).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete setting", details: error.message });
  }
};