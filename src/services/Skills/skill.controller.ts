// src/services/Skill/skill.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listSkillsService,
  getSkillsGroupedService,
  getSkillByIdService,
  getSkillByTechIdService,
  createSkillService,
  updateSkillService,
  upsertSkillByTechService,
  deleteSkillService,
  TSkillFilters,
  TCreateSkillInput,
  TUpdateSkillInput,
  TTechCategory,
} from "./skill.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseSkillFilters = (query: Request["query"]): TSkillFilters => {
  const filters: TSkillFilters = {};

  if (typeof query.category === "string") {
    const valid: TTechCategory[] = [
      "frontend",
      "backend",
      "database",
      "devops",
      "mobile",
      "ai",
    ];
    if (valid.includes(query.category as TTechCategory)) {
      filters.category = query.category as TTechCategory;
    } else {
      throw new Error(`Invalid category: ${query.category}`);
    }
  }

  if (typeof query.minProficiency === "string") {
    const n = Number(query.minProficiency);
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      throw new Error("minProficiency must be between 0 and 100");
    }
    filters.minProficiency = n;
  }

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.sortBy === "string") {
    const valid = ["proficiency", "yearsExperience", "name"] as const;
    if (valid.includes(query.sortBy as (typeof valid)[number])) {
      filters.sortBy = query.sortBy as (typeof valid)[number];
    } else {
      throw new Error(`Invalid sortBy: ${query.sortBy}`);
    }
  }

  if (typeof query.sortOrder === "string") {
    const valid = ["asc", "desc"] as const;
    if (valid.includes(query.sortOrder as (typeof valid)[number])) {
      filters.sortOrder = query.sortOrder as (typeof valid)[number];
    } else {
      throw new Error(`Invalid sortOrder: ${query.sortOrder}`);
    }
  }

  if (query.page !== undefined) {
    const n = Number(query.page);
    if (!Number.isInteger(n) || n < 1) {
      throw new Error("page must be a positive integer");
    }
    filters.page = n;
  }

  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new Error("limit must be between 1 and 100");
    }
    filters.limit = n;
  }

  return filters;
};

const validateCreatePayload = (body: any): TCreateSkillInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.techId !== "string" || !body.techId.trim()) {
    throw new Error("techId is required and must be a non-empty string");
  }

  if (body.proficiency !== undefined && body.proficiency !== null) {
    if (
      !Number.isInteger(body.proficiency) ||
      body.proficiency < 0 ||
      body.proficiency > 100
    ) {
      throw new Error("proficiency must be an integer between 0 and 100");
    }
  }

  if (body.yearsExperience !== undefined && body.yearsExperience !== null) {
    if (
      !Number.isInteger(body.yearsExperience) ||
      body.yearsExperience < 0
    ) {
      throw new Error("yearsExperience must be a non-negative integer");
    }
  }

  return {
    techId: body.techId,
    proficiency: body.proficiency,
    yearsExperience: body.yearsExperience,
  };
};

const validateUpdatePayload = (body: any): TUpdateSkillInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  const allowedKeys = ["proficiency", "yearsExperience"];
  const unknown = Object.keys(body).filter((k) => !allowedKeys.includes(k));
  if (unknown.length > 0) {
    throw new Error(`Unknown fields: ${unknown.join(", ")}`);
  }

  if (body.proficiency !== undefined && body.proficiency !== null) {
    if (
      !Number.isInteger(body.proficiency) ||
      body.proficiency < 0 ||
      body.proficiency > 100
    ) {
      throw new Error("proficiency must be an integer between 0 and 100");
    }
  }

  if (body.yearsExperience !== undefined && body.yearsExperience !== null) {
    if (
      !Number.isInteger(body.yearsExperience) ||
      body.yearsExperience < 0
    ) {
      throw new Error("yearsExperience must be a non-negative integer");
    }
  }

  return body as TUpdateSkillInput;
};

// ==========================================
// PUBLIC — LIST
// ==========================================
export const listSkills = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseSkillFilters(req.query);
    const result = await listSkillsService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GROUPED BY CATEGORY
// ==========================================
export const getSkillsGrouped = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grouped = await getSkillsGroupedService();
    res.status(200).json({ data: grouped });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY ID
// ==========================================
export const getSkillById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const skill = await getSkillByIdService(id);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }

    res.status(200).json({ data: skill });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY TECH ID
// ==========================================
export const getSkillByTechId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const techId = getParam(req.params.techId);
    if (!techId) {
      res.status(400).json({ error: "techId is required" });
      return;
    }

    const skill = await getSkillByTechIdService(techId);
    if (!skill) {
      res.status(404).json({ error: "No skill found for this technology" });
      return;
    }

    res.status(200).json({ data: skill });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createSkill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const skill = await createSkillService(input);

    res.status(201).json({
      message: "Skill created successfully",
      data: skill,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updateSkill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const input = validateUpdatePayload(req.body);
    const skill = await updateSkillService(id, input);

    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }

    res.status(200).json({
      message: "Skill updated successfully",
      data: skill,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPSERT BY TECH ID
// ==========================================
export const upsertSkillByTech = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const techId = getParam(req.params.techId);
    if (!techId) {
      res.status(400).json({ error: "techId is required" });
      return;
    }

    const proficiency = req.body?.proficiency;
    const yearsExperience = req.body?.yearsExperience;

    if (proficiency !== undefined && proficiency !== null) {
      if (
        !Number.isInteger(proficiency) ||
        proficiency < 0 ||
        proficiency > 100
      ) {
        res.status(400).json({
          error: "proficiency must be an integer between 0 and 100",
        });
        return;
      }
    }

    if (yearsExperience !== undefined && yearsExperience !== null) {
      if (!Number.isInteger(yearsExperience) || yearsExperience < 0) {
        res.status(400).json({
          error: "yearsExperience must be a non-negative integer",
        });
        return;
      }
    }

    const skill = await upsertSkillByTechService(techId, {
      proficiency,
      yearsExperience,
    });

    res.status(200).json({
      message: "Skill upserted successfully",
      data: skill,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE
// ==========================================
export const deleteSkill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const ok = await deleteSkillService(id);
    if (!ok) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};