// src/services/Certification/certification.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listCertificationsService,
  getCertificationByIdService,
  getCertificationStatsService,
  createCertificationService,
  updateCertificationService,
  deleteCertificationService,
  TCertificationFilters,
  TCreateCertificationInput,
  TUpdateCertificationInput,
} from "./certification.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseCertificationFilters = (
  query: Request["query"]
): TCertificationFilters => {
  const filters: TCertificationFilters = {};

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.issuer === "string" && query.issuer.trim()) {
    filters.issuer = query.issuer.trim();
  }

  if (typeof query.sortBy === "string") {
    const valid = ["name", "issuer"] as const;
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

const validateCreatePayload = (body: any): TCreateCertificationInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new Error("name is required and must be a non-empty string");
  }
  if (body.name.length > 255) {
    throw new Error("name must be at most 255 characters");
  }

  if (typeof body.issuer !== "string" || !body.issuer.trim()) {
    throw new Error("issuer is required and must be a non-empty string");
  }
  if (body.issuer.length > 255) {
    throw new Error("issuer must be at most 255 characters");
  }

  return {
    name: body.name,
    issuer: body.issuer,
    badgeMediaId: body.badgeMediaId ?? null,
  };
};

const validateUpdatePayload = (body: any): TUpdateCertificationInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new Error("name must be a non-empty string");
    }
    if (body.name.length > 255) {
      throw new Error("name must be at most 255 characters");
    }
  }

  if (body.issuer !== undefined) {
    if (typeof body.issuer !== "string" || !body.issuer.trim()) {
      throw new Error("issuer must be a non-empty string");
    }
    if (body.issuer.length > 255) {
      throw new Error("issuer must be at most 255 characters");
    }
  }

  return body as TUpdateCertificationInput;
};

// ==========================================
// PUBLIC — LIST
// ==========================================
export const listCertifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseCertificationFilters(req.query);
    const result = await listCertificationsService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY ID
// ==========================================
export const getCertificationById = async (
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

    const cert = await getCertificationByIdService(id);
    if (!cert) {
      res.status(404).json({ error: "Certification not found" });
      return;
    }

    res.status(200).json({ data: cert });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — STATS
// ==========================================
export const getCertificationStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getCertificationStatsService();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createCertification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const cert = await createCertificationService(input);

    res.status(201).json({
      message: "Certification created successfully",
      data: cert,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updateCertification = async (
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
    const cert = await updateCertificationService(id, input);

    if (!cert) {
      res.status(404).json({ error: "Certification not found" });
      return;
    }

    res.status(200).json({
      message: "Certification updated successfully",
      data: cert,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE
// ==========================================
export const deleteCertification = async (
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

    const ok = await deleteCertificationService(id);
    if (!ok) {
      res.status(404).json({ error: "Certification not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};