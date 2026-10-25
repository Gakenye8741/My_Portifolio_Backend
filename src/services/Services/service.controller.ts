// src/services/Service/service.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listServicesService,
  getServiceBySlugService,
  getServiceByIdService,
  createServiceService,
  updateServiceService,
  deleteServiceService,
  toggleServiceAvailabilityService,
  getServicesByIdsService,
  TServiceFilters,
  TCreateServiceInput,
  TUpdateServiceInput,
  TPricingType,
} from "./service.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseServiceFilters = (query: Request["query"]): TServiceFilters => {
  const filters: TServiceFilters = {};

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.pricingType === "string") {
    const valid: TPricingType[] = ["hourly", "fixed", "contact"];
    if (valid.includes(query.pricingType as TPricingType)) {
      filters.pricingType = query.pricingType as TPricingType;
    } else {
      throw new Error(`Invalid pricingType: ${query.pricingType}`);
    }
  }

  if (typeof query.isAvailable === "string") {
    filters.isAvailable = query.isAvailable === "true";
  }

  if (typeof query.sortBy === "string") {
    const valid = ["createdAt", "title"] as const;
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

const validateCreatePayload = (body: any): TCreateServiceInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new Error("title is required and must be a non-empty string");
  }
  if (body.title.length > 100) {
    throw new Error("title must be at most 100 characters");
  }

  if (typeof body.description !== "string" || !body.description.trim()) {
    throw new Error("description is required and must be a non-empty string");
  }

  if (body.slug !== undefined && typeof body.slug !== "string") {
    throw new Error("slug must be a string");
  }

  if (body.pricingType !== undefined) {
    const valid: TPricingType[] = ["hourly", "fixed", "contact"];
    if (!valid.includes(body.pricingType)) {
      throw new Error(`pricingType must be one of: ${valid.join(", ")}`);
    }
  }

  if (body.techIds !== undefined) {
    if (
      !Array.isArray(body.techIds) ||
      body.techIds.some((id: unknown) => typeof id !== "string")
    ) {
      throw new Error("techIds must be an array of strings");
    }
  }

  return {
    title: body.title,
    slug: body.slug,
    description: body.description,
    iconName: body.iconName ?? null,
    pricingType: body.pricingType,
    isAvailable: body.isAvailable,
    techIds: body.techIds,
  };
};

const validateUpdatePayload = (body: any): TUpdateServiceInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("title must be a non-empty string");
    }
    if (body.title.length > 100) {
      throw new Error("title must be at most 100 characters");
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      throw new Error("description must be a non-empty string");
    }
  }

  if (body.pricingType !== undefined) {
    const valid: TPricingType[] = ["hourly", "fixed", "contact"];
    if (!valid.includes(body.pricingType)) {
      throw new Error(`pricingType must be one of: ${valid.join(", ")}`);
    }
  }

  if (body.techIds !== undefined) {
    if (
      !Array.isArray(body.techIds) ||
      body.techIds.some((id: unknown) => typeof id !== "string")
    ) {
      throw new Error("techIds must be an array of strings");
    }
  }

  return body as TUpdateServiceInput;
};

// ==========================================
// PUBLIC — LIST
// ==========================================
export const listServices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseServiceFilters(req.query);
    const result = await listServicesService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY SLUG
// ==========================================
export const getServiceBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const slug = getParam(req.params.slug);
    if (!slug) {
      res.status(400).json({ error: "slug is required" });
      return;
    }
    const service = await getServiceBySlugService(slug);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.status(200).json({ data: service });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — BULK GET BY IDS
// ==========================================
export const getServicesByIds = async (
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

    const services = await getServicesByIdsService(cleaned);
    res.status(200).json({ data: services });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — GET BY ID
// ==========================================
export const getServiceById = async (
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

    const service = await getServiceByIdService(id);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.status(200).json({ data: service });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createService = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const service = await createServiceService(input);

    res.status(201).json({
      message: "Service created successfully",
      data: service,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updateService = async (
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
    const service = await updateServiceService(id, input);

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.status(200).json({
      message: "Service updated successfully",
      data: service,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TOGGLE AVAILABILITY
// ==========================================
export const toggleAvailability = async (
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

    const service = await toggleServiceAvailabilityService(id);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.status(200).json({
      message: `Service ${service.isAvailable ? "available" : "unavailable"}`,
      data: service,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE
// ==========================================
export const deleteService = async (
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

    const ok = await deleteServiceService(id);
    if (!ok) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};