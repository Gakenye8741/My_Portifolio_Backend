// src/services/Media/media.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  createMediaService,
  getAllMediaService,
  getMediaByIdService,
  getBulkMediaService,
  checkMediaUsageService,
  updateMediaService,
  deleteMediaService,
  TMediaFilters,
  TCreateMediaInput,
} from "./MediaAssests.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseMediaFilters = (query: Request["query"]): TMediaFilters => {
  const filters: TMediaFilters = {};

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.fileType === "string" && query.fileType.trim()) {
    filters.fileType = query.fileType.trim();
  }

  if (typeof query.sortBy === "string") {
    const valid = ["createdAt", "fileName", "fileSize"] as const;
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
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      throw new Error("limit must be between 1 and 200");
    }
    filters.limit = n;
  }

  return filters;
};

const validateCreatePayload = (body: any): TCreateMediaInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.fileName !== "string" || !body.fileName.trim()) {
    throw new Error("fileName is required and must be a non-empty string");
  }
  if (body.fileName.length > 255) {
    throw new Error("fileName must be at most 255 characters");
  }

  if (typeof body.fileUrl !== "string" || !body.fileUrl.trim()) {
    throw new Error("fileUrl is required and must be a non-empty string");
  }

  if (body.fileType !== undefined && body.fileType !== null) {
    if (typeof body.fileType !== "string") {
      throw new Error("fileType must be a string");
    }
    if (body.fileType.length > 50) {
      throw new Error("fileType must be at most 50 characters");
    }
  }

  if (body.fileSize !== undefined && body.fileSize !== null) {
    if (!Number.isInteger(body.fileSize) || body.fileSize < 0) {
      throw new Error("fileSize must be a non-negative integer");
    }
  }

  if (body.publicId !== undefined && body.publicId !== null) {
    if (typeof body.publicId !== "string") {
      throw new Error("publicId must be a string");
    }
    if (body.publicId.length > 255) {
      throw new Error("publicId must be at most 255 characters");
    }
  }

  if (body.hash !== undefined && body.hash !== null) {
    if (typeof body.hash !== "string") {
      throw new Error("hash must be a string");
    }
    if (body.hash.length > 64) {
      throw new Error("hash must be at most 64 characters");
    }
  }

  return {
    fileName: body.fileName,
    fileUrl: body.fileUrl,
    fileType: body.fileType,
    fileSize: body.fileSize,
    hash: body.hash,
    publicId: body.publicId,
  };
};

const validateUpdatePayload = (body: any): Partial<TCreateMediaInput> => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  const allowedKeys = ["fileName", "fileUrl", "fileType", "fileSize", "hash", "publicId"];
  const unknown = Object.keys(body).filter((k) => !allowedKeys.includes(k));
  if (unknown.length > 0) {
    throw new Error(`Unknown fields: ${unknown.join(", ")}`);
  }

  if (body.fileName !== undefined) {
    if (typeof body.fileName !== "string" || !body.fileName.trim()) {
      throw new Error("fileName must be a non-empty string");
    }
    if (body.fileName.length > 255) {
      throw new Error("fileName must be at most 255 characters");
    }
  }

  if (body.fileUrl !== undefined) {
    if (typeof body.fileUrl !== "string" || !body.fileUrl.trim()) {
      throw new Error("fileUrl must be a non-empty string");
    }
  }

  if (body.fileType !== undefined && body.fileType !== null && typeof body.fileType !== "string") {
    throw new Error("fileType must be a string or null");
  }

  if (
    body.fileSize !== undefined &&
    body.fileSize !== null &&
    (!Number.isInteger(body.fileSize) || body.fileSize < 0)
  ) {
    throw new Error("fileSize must be a non-negative integer or null");
  }

  return body as Partial<TCreateMediaInput>;
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const asset = await createMediaService(input);
    res.status(201).json({
      message: "Media asset created successfully",
      data: asset,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — LIST (paginated + filters)
// ==========================================
export const getAllMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseMediaFilters(req.query);
    const result = await getAllMediaService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY ID
// ==========================================
export const getMediaById = async (
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

    const asset = await getMediaByIdService(id);
    if (!asset) {
      res.status(404).json({ error: "Media asset not found" });
      return;
    }

    res.status(200).json({ data: asset });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — BULK GET
// ==========================================
export const getBulkMedia = async (
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

    const assets = await getBulkMediaService(cleaned);
    res.status(200).json({ data: assets });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — USAGE CHECK
// ==========================================
export const getMediaUsage = async (
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

    const asset = await getMediaByIdService(id);
    if (!asset) {
      res.status(404).json({ error: "Media asset not found" });
      return;
    }

    const usage = await checkMediaUsageService(id);

    const totalUsages =
      usage.projects.length +
      usage.sections.length +
      usage.posts.length +
      usage.testimonials.length +
      usage.certifications.length +
      usage.seo.length +
      usage.pageContent.length;

    res.status(200).json({
      data: {
        mediaId: id,
        totalUsages,
        usage,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updateMedia = async (
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
    const updated = await updateMediaService(id, input);

    if (!updated) {
      res.status(404).json({ error: "Media asset not found" });
      return;
    }

    res.status(200).json({
      message: "Media updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE
// ==========================================
export const deleteMedia = async (
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

    const ok = await deleteMediaService(id);
    if (!ok) {
      res.status(404).json({ error: "Media asset not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};