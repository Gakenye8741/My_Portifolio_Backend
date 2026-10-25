// src/services/Technology/technology.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listTechnologiesService,
  getTechnologyByIdService,
  getTechnologiesByIdsService,
  getTechnologiesByCategoryService,
  getTechnologyUsageService,
  createTechnologyService,
  updateTechnologyService,
  deleteTechnologyService,
  TTechnologyFilters,
  TCreateTechnologyInput,
  TUpdateTechnologyInput,
  TTechCategory,
} from "./technology.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseTechFilters = (query: Request["query"]): TTechnologyFilters => {
  const filters: TTechnologyFilters = {};

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

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.sortBy === "string") {
    const valid = ["name", "category"] as const;
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

const validateCreatePayload = (body: any): TCreateTechnologyInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new Error("name is required and must be a non-empty string");
  }
  if (body.name.length > 50) {
    throw new Error("name must be at most 50 characters");
  }

  const validCategories: TTechCategory[] = [
    "frontend",
    "backend",
    "database",
    "devops",
    "mobile",
    "ai",
  ];

  if (!body.category || !validCategories.includes(body.category)) {
    throw new Error(`category must be one of: ${validCategories.join(", ")}`);
  }

  return {
    name: body.name,
    category: body.category,
    iconName: body.iconName ?? null,
  };
};

const validateUpdatePayload = (body: any): TUpdateTechnologyInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new Error("name must be a non-empty string");
    }
    if (body.name.length > 50) {
      throw new Error("name must be at most 50 characters");
    }
  }

  if (body.category !== undefined) {
    const validCategories: TTechCategory[] = [
      "frontend",
      "backend",
      "database",
      "devops",
      "mobile",
      "ai",
    ];
    if (!validCategories.includes(body.category)) {
      throw new Error(`category must be one of: ${validCategories.join(", ")}`);
    }
  }

  return body as TUpdateTechnologyInput;
};

// ==========================================
// PUBLIC — LIST
// ==========================================
export const listTechnologies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseTechFilters(req.query);
    const result = await listTechnologiesService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GROUPED BY CATEGORY
// ==========================================
export const getTechnologiesByCategory = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grouped = await getTechnologiesByCategoryService();
    res.status(200).json({ data: grouped });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — BULK GET
// ==========================================
export const getTechnologiesByIds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw = req.query.ids;
    if (!raw) {
      res.status(400).json({ error: "ids query parameter is required" });
      return;
    }

    const ids = Array.isArray(raw)
      ? (raw as string[]).flatMap((s) => s.split(","))
      : String(raw).split(",");

    const cleaned = ids.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      res.status(400).json({ error: "ids must contain at least one id" });
      return;
    }

    const techs = await getTechnologiesByIdsService(cleaned);
    res.status(200).json({ data: techs });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY ID
// ==========================================
export const getTechnologyById = async (
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

    const tech = await getTechnologyByIdService(id);
    if (!tech) {
      res.status(404).json({ error: "Technology not found" });
      return;
    }

    res.status(200).json({ data: tech });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — USAGE CHECK
// ==========================================
export const getTechnologyUsage = async (
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

    const tech = await getTechnologyByIdService(id);
    if (!tech) {
      res.status(404).json({ error: "Technology not found" });
      return;
    }

    const usage = await getTechnologyUsageService(id);
    res.status(200).json({ data: { technologyId: id, usage } });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createTechnology = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const tech = await createTechnologyService(input);

    res.status(201).json({
      message: "Technology created successfully",
      data: tech,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updateTechnology = async (
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
    const tech = await updateTechnologyService(id, input);

    if (!tech) {
      res.status(404).json({ error: "Technology not found" });
      return;
    }

    res.status(200).json({
      message: "Technology updated successfully",
      data: tech,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE
// ==========================================
export const deleteTechnology = async (
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

    const ok = await deleteTechnologyService(id);
    if (!ok) {
      res.status(404).json({ error: "Technology not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};