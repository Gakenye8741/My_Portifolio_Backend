// src/services/Project/project.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listProjectsService,
  getProjectBySlugService,
  getProjectByIdService,
  getProjectStatsService,
  createProjectService,
  updateProjectService,
  deleteProjectService,
  hardDeleteProjectService,
  restoreProjectService,
  toggleFeaturedService,
  updateProjectStatusService,
  TProjectFilters,
  TProjectStatus,
  TCreateProjectInput,
  TUpdateProjectInput,
  TLinkType,
} from "./Project.service";

// ==========================================
// HELPERS
// ==========================================

/** Safely extract a single string param from Express 5 params */
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

/** Parse and validate query params into TProjectFilters */
const parseProjectFilters = (query: Request["query"]): TProjectFilters => {
  const filters: TProjectFilters = {};

  if (typeof query.status === "string") {
    const valid: TProjectStatus[] = ["draft", "published", "archived"];
    if (valid.includes(query.status as TProjectStatus)) {
      filters.status = query.status as TProjectStatus;
    } else {
      throw new Error(`Invalid status: ${query.status}`);
    }
  }

  if (typeof query.featured === "string") {
    filters.featured = query.featured === "true";
  }

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (query.techIds) {
    const raw = Array.isArray(query.techIds)
      ? (query.techIds as string[])
      : [String(query.techIds)];
    filters.techIds = raw
      .flatMap((s) => s.split(","))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof query.includeDeleted === "string") {
    filters.includeDeleted = query.includeDeleted === "true";
  }

  if (typeof query.sortBy === "string") {
    const valid = ["createdAt", "updatedAt", "viewCount", "title"] as const;
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

/** Validate the incoming payload for creating a project */
const validateCreatePayload = (body: any): TCreateProjectInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }
  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new Error("title is required and must be a non-empty string");
  }
  if (body.title.length > 255) {
    throw new Error("title must be at most 255 characters");
  }
  if (typeof body.mainDescription !== "string" || !body.mainDescription.trim()) {
    throw new Error("mainDescription is required and must be a non-empty string");
  }
  if (body.status !== undefined) {
    const valid: TProjectStatus[] = ["draft", "published", "archived"];
    if (!valid.includes(body.status)) {
      throw new Error(`status must be one of: ${valid.join(", ")}`);
    }
  }
  if (body.slug !== undefined && typeof body.slug !== "string") {
    throw new Error("slug must be a string");
  }
  if (body.links !== undefined) {
    if (!Array.isArray(body.links)) throw new Error("links must be an array");
    const validLinkTypes: TLinkType[] = [
      "github_frontend", "github_backend", "github_fullstack",
      "live_demo", "documentation", "design",
    ];
    for (const [i, link] of body.links.entries()) {
      if (typeof link?.label !== "string" || !link.label.trim()) {
        throw new Error(`links[${i}].label is required`);
      }
      if (typeof link?.url !== "string" || !link.url.trim()) {
        throw new Error(`links[${i}].url is required`);
      }
      if (link.type !== undefined && !validLinkTypes.includes(link.type)) {
        throw new Error(`links[${i}].type must be one of: ${validLinkTypes.join(", ")}`);
      }
    }
  }
  if (body.sections !== undefined) {
    if (!Array.isArray(body.sections)) throw new Error("sections must be an array");
    for (const [i, s] of body.sections.entries()) {
      if (s?.sectionTitle !== undefined && typeof s.sectionTitle !== "string") {
        throw new Error(`sections[${i}].sectionTitle must be a string`);
      }
      if (s?.explanation !== undefined && typeof s.explanation !== "string") {
        throw new Error(`sections[${i}].explanation must be a string`);
      }
      if (s?.order !== undefined && !Number.isInteger(s.order)) {
        throw new Error(`sections[${i}].order must be an integer`);
      }
    }
  }
  if (body.techIds !== undefined) {
    if (!Array.isArray(body.techIds) || body.techIds.some((id: unknown) => typeof id !== "string")) {
      throw new Error("techIds must be an array of strings");
    }
  }
  if (body.timeline !== undefined) {
    if (!Array.isArray(body.timeline)) throw new Error("timeline must be an array");
    for (const [i, t] of body.timeline.entries()) {
      if (typeof t?.title !== "string" || !t.title.trim()) {
        throw new Error(`timeline[${i}].title is required`);
      }
    }
  }

  return {
    title: body.title,
    slug: body.slug,
    mainDescription: body.mainDescription,
    mainThumbnailId: body.mainThumbnailId ?? null,
    status: body.status,
    isFeatured: body.isFeatured,
    links: body.links,
    sections: body.sections,
    techIds: body.techIds,
    timeline: body.timeline,
  };
};

/** Validate the incoming payload for updating a project (all optional) */
const validateUpdatePayload = (body: any): TUpdateProjectInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("title must be a non-empty string");
    }
    if (body.title.length > 255) {
      throw new Error("title must be at most 255 characters");
    }
  }
  if (body.mainDescription !== undefined) {
    if (typeof body.mainDescription !== "string" || !body.mainDescription.trim()) {
      throw new Error("mainDescription must be a non-empty string");
    }
  }
  if (body.status !== undefined) {
    const valid: TProjectStatus[] = ["draft", "published", "archived"];
    if (!valid.includes(body.status)) {
      throw new Error(`status must be one of: ${valid.join(", ")}`);
    }
  }
  return body as TUpdateProjectInput;
};

// ==========================================
// PUBLIC — LIST
// ==========================================
export const listProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseProjectFilters(req.query);
    const result = await listProjectsService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY SLUG
// ==========================================
export const getProjectBySlug = async (
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
    const project = await getProjectBySlugService(slug);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(200).json({ data: project });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — GET BY ID
// ==========================================
export const getProjectById = async (
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
    const project = await getProjectByIdService(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(200).json({ data: project });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — STATS
// ==========================================
export const getProjectStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getProjectStatsService();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE (returns full project WITH children)
// ==========================================
export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const project = await createProjectService(input);
    res.status(201).json({
      message: "Project created successfully",
      data: project, // ← includes thumbnail, links, sections, timeline, techs
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE (returns full project WITH children)
// ==========================================
export const updateProject = async (
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
    const project = await updateProjectService(id, input);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(200).json({
      message: "Project updated successfully",
      data: project, // ← includes thumbnail, links, sections, timeline, techs
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TOGGLE FEATURED
// ==========================================
export const toggleProjectFeatured = async (
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
    const project = await toggleFeaturedService(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(200).json({
      message: `Project ${project.isFeatured ? "featured" : "unfeatured"}`,
      data: project,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE STATUS
// ==========================================
export const updateProjectStatus = async (
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
    const status = req.body?.status as TProjectStatus | undefined;
    const valid: TProjectStatus[] = ["draft", "published", "archived"];
    if (!status || !valid.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${valid.join(", ")}` });
      return;
    }
    const project = await updateProjectStatusService(id, status);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(200).json({
      message: `Status updated to ${status}`,
      data: project,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — SOFT DELETE
// ==========================================
export const deleteProject = async (
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
    const ok = await deleteProjectService(id);
    if (!ok) {
      res.status(404).json({ error: "Project not found or already deleted" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — RESTORE
// ==========================================
export const restoreProject = async (
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
    const ok = await restoreProjectService(id);
    if (!ok) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(200).json({ message: "Project restored" });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — HARD DELETE
// ==========================================
export const hardDeleteProject = async (
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
    const ok = await hardDeleteProjectService(id);
    if (!ok) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};