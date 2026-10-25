// src/services/Testimonial/testimonial.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listTestimonialsService,
  getTestimonialByIdService,
  getTestimonialStatsService,
  createTestimonialService,
  updateTestimonialService,
  togglePublishTestimonialService,
  deleteTestimonialService,
  TTestimonialFilters,
  TCreateTestimonialInput,
  TUpdateTestimonialInput,
} from "./testimonial.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseTestimonialFilters = (
  query: Request["query"]
): TTestimonialFilters => {
  const filters: TTestimonialFilters = {};

  if (typeof query.isPublished === "string") {
    filters.isPublished = query.isPublished === "true";
  }

  if (typeof query.minRating === "string") {
    const n = Number(query.minRating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new Error("minRating must be between 1 and 5");
    }
    filters.minRating = n;
  }

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.sortBy === "string") {
    const valid = ["createdAt", "rating", "authorName"] as const;
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

const validateCreatePayload = (body: any): TCreateTestimonialInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.authorName !== "string" || !body.authorName.trim()) {
    throw new Error("authorName is required and must be a non-empty string");
  }
  if (body.authorName.length > 100) {
    throw new Error("authorName must be at most 100 characters");
  }

  if (typeof body.content !== "string" || !body.content.trim()) {
    throw new Error("content is required and must be a non-empty string");
  }

  if (body.authorRole !== undefined && body.authorRole !== null && typeof body.authorRole !== "string") {
    throw new Error("authorRole must be a string or null");
  }
  if (body.company !== undefined && body.company !== null && typeof body.company !== "string") {
    throw new Error("company must be a string or null");
  }
  if (body.sourceUrl !== undefined && body.sourceUrl !== null && typeof body.sourceUrl !== "string") {
    throw new Error("sourceUrl must be a string or null");
  }

  if (body.rating !== undefined && body.rating !== null) {
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      throw new Error("rating must be an integer between 1 and 5");
    }
  }

  if (body.isPublished !== undefined && typeof body.isPublished !== "boolean") {
    throw new Error("isPublished must be a boolean");
  }

  return {
    authorName: body.authorName,
    authorRole: body.authorRole,
    company: body.company,
    content: body.content,
    rating: body.rating,
    sourceUrl: body.sourceUrl,
    authorAvatarId: body.authorAvatarId ?? null,
    isPublished: body.isPublished,
  };
};

const validateUpdatePayload = (body: any): TUpdateTestimonialInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (body.authorName !== undefined) {
    if (typeof body.authorName !== "string" || !body.authorName.trim()) {
      throw new Error("authorName must be a non-empty string");
    }
    if (body.authorName.length > 100) {
      throw new Error("authorName must be at most 100 characters");
    }
  }

  if (body.content !== undefined) {
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new Error("content must be a non-empty string");
    }
  }

  if (body.rating !== undefined && body.rating !== null) {
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      throw new Error("rating must be an integer between 1 and 5");
    }
  }

  if (body.isPublished !== undefined && typeof body.isPublished !== "boolean") {
    throw new Error("isPublished must be a boolean");
  }

  return body as TUpdateTestimonialInput;
};

// ==========================================
// PUBLIC — LIST PUBLISHED
// ==========================================
export const listPublishedTestimonials = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseTestimonialFilters(req.query);
    // force published-only for public endpoint
    filters.isPublished = true;
    const result = await listTestimonialsService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — LIST ALL
// ==========================================
export const listAllTestimonials = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseTestimonialFilters(req.query);
    const result = await listTestimonialsService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY ID (only if published)
// ==========================================
export const getPublishedTestimonialById = async (
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

    const t = await getTestimonialByIdService(id);
    if (!t || !t.isPublished) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.status(200).json({ data: t });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — GET BY ID
// ==========================================
export const getTestimonialById = async (
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

    const t = await getTestimonialByIdService(id);
    if (!t) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.status(200).json({ data: t });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — STATS
// ==========================================
export const getTestimonialStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getTestimonialStatsService();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createTestimonial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const t = await createTestimonialService(input);

    res.status(201).json({
      message: "Testimonial created successfully",
      data: t,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updateTestimonial = async (
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
    const t = await updateTestimonialService(id, input);

    if (!t) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.status(200).json({
      message: "Testimonial updated successfully",
      data: t,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TOGGLE PUBLISH
// ==========================================
export const toggleTestimonialPublish = async (
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

    const t = await togglePublishTestimonialService(id);
    if (!t) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.status(200).json({
      message: `Testimonial ${t.isPublished ? "published" : "unpublished"}`,
      data: t,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE
// ==========================================
export const deleteTestimonial = async (
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

    const ok = await deleteTestimonialService(id);
    if (!ok) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};