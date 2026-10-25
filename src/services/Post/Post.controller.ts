// src/services/Post/post.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listPostsService,
  getPostBySlugService,
  getPostByIdService,
  getPostStatsService,
  createPostService,
  updatePostService,
  deletePostService,
  restorePostService,
  hardDeletePostService,
  togglePublishService,
  toggleFeaturedPostService,
  listRevisionsService,
  addReactionService,
  getReactionCountsService,
  ratePostService,
  getRatingsSummaryService,
  TPostFilters,
  TCreatePostInput,
  TUpdatePostInput,
  TCreatePostReactionInput,
  TCreatePostRatingInput,
} from "./Post.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parsePostFilters = (query: Request["query"]): TPostFilters => {
  const filters: TPostFilters = {};

  if (typeof query.status === "string") {
    const valid = ["draft", "published"] as const;
    if (valid.includes(query.status as (typeof valid)[number])) {
      filters.status = query.status as "draft" | "published";
    } else {
      throw new Error(`Invalid status: ${query.status}`);
    }
  }

  if (typeof query.featured === "string") {
    filters.featured = query.featured === "true";
  }

  if (typeof query.tagSlug === "string" && query.tagSlug.trim()) {
    filters.tagSlug = query.tagSlug.trim();
  }

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.includeDeleted === "string") {
    filters.includeDeleted = query.includeDeleted === "true";
  }

  if (typeof query.sortBy === "string") {
    const valid = ["createdAt", "updatedAt", "viewCount", "publishedAt"] as const;
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

const validateCreatePayload = (body: any): TCreatePostInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new Error("title is required and must be a non-empty string");
  }
  if (body.title.length > 255) {
    throw new Error("title must be at most 255 characters");
  }

  if (typeof body.content !== "string" || !body.content.trim()) {
    throw new Error("content is required and must be a non-empty string");
  }

  if (body.slug !== undefined && typeof body.slug !== "string") {
    throw new Error("slug must be a string");
  }

  if (body.excerpt !== undefined && body.excerpt !== null && typeof body.excerpt !== "string") {
    throw new Error("excerpt must be a string or null");
  }

  if (body.readingTime !== undefined && body.readingTime !== null) {
    if (!Number.isInteger(body.readingTime) || body.readingTime < 1) {
      throw new Error("readingTime must be a positive integer (minutes)");
    }
  }

  if (body.tagSlugs !== undefined) {
    if (!Array.isArray(body.tagSlugs) || body.tagSlugs.some((t: unknown) => typeof t !== "string")) {
      throw new Error("tagSlugs must be an array of strings");
    }
  }

  if (body.isPublished !== undefined && typeof body.isPublished !== "boolean") {
    throw new Error("isPublished must be a boolean");
  }

  if (body.isFeatured !== undefined && typeof body.isFeatured !== "boolean") {
    throw new Error("isFeatured must be a boolean");
  }

  return {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    content: body.content,
    coverImageId: body.coverImageId ?? null,
    readingTime: body.readingTime,
    isFeatured: body.isFeatured,
    isPublished: body.isPublished,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
    tagSlugs: body.tagSlugs,
  };
};

const validateUpdatePayload = (body: any): TUpdatePostInput => {
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

  if (body.content !== undefined) {
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new Error("content must be a non-empty string");
    }
  }

  if (body.slug !== undefined && typeof body.slug !== "string") {
    throw new Error("slug must be a string");
  }

  if (body.tagSlugs !== undefined) {
    if (!Array.isArray(body.tagSlugs) || body.tagSlugs.some((t: unknown) => typeof t !== "string")) {
      throw new Error("tagSlugs must be an array of strings");
    }
  }

  return body as TUpdatePostInput;
};

// ==========================================
// PUBLIC — LIST
// ==========================================
export const listPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parsePostFilters(req.query);
    const result = await listPostsService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY SLUG (increments view)
// ==========================================
export const getPostBySlug = async (
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
    const post = await getPostBySlugService(slug);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.status(200).json({ data: post });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — ADD REACTION
// ==========================================
export const addReaction = async (
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

    const input: TCreatePostReactionInput = {
      reaction: req.body?.reaction,
    };

    const created = await addReactionService(id, input);
    const counts = await getReactionCountsService(id);

    res.status(201).json({
      message: "Reaction added",
      data: created,
      counts,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET REACTION COUNTS
// ==========================================
export const getReactionCounts = async (
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

    const counts = await getReactionCountsService(id);
    res.status(200).json({ data: counts });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — RATE POST
// ==========================================
export const ratePost = async (
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

    // visitorId from body OR from a cookie the frontend sets
    const visitorId =
      (req.body?.visitorId as string | undefined) ??
      (req.cookies?.visitorId as string | undefined);

    if (!visitorId) {
      res.status(400).json({
        error: "visitorId is required (body or cookie)",
      });
      return;
    }

    const input: TCreatePostRatingInput = {
      visitorId,
      rating: Number(req.body?.rating),
    };

    const created = await ratePostService(id, input);
    const summary = await getRatingsSummaryService(id);

    res.status(201).json({
      message: "Rating saved",
      data: created,
      summary,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET RATINGS SUMMARY
// ==========================================
export const getRatingsSummary = async (
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

    const summary = await getRatingsSummaryService(id);
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — GET BY ID
// ==========================================
export const getPostById = async (
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

    const post = await getPostByIdService(id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.status(200).json({ data: post });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — STATS
// ==========================================
export const getPostStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getPostStatsService();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const authorId = req.user?.id ?? null;
    const post = await createPostService(input, authorId);

    res.status(201).json({
      message: "Post created successfully",
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updatePost = async (
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
    const editorId = req.user?.id ?? null;
    const post = await updatePostService(id, input, editorId);

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.status(200).json({
      message: "Post updated successfully",
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TOGGLE PUBLISH
// ==========================================
export const togglePublish = async (
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

    const post = await togglePublishService(id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.status(200).json({
      message: `Post ${post.isPublished ? "published" : "unpublished"}`,
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TOGGLE FEATURED
// ==========================================
export const toggleFeatured = async (
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

    const post = await toggleFeaturedPostService(id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.status(200).json({
      message: `Post ${post.isFeatured ? "featured" : "unfeatured"}`,
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — LIST REVISIONS
// ==========================================
export const listRevisions = async (
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

    const revisions = await listRevisionsService(id);
    res.status(200).json({ data: revisions });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE (soft)
// ==========================================
export const deletePost = async (
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

    const ok = await deletePostService(id);
    if (!ok) {
      res.status(404).json({ error: "Post not found or already deleted" });
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
export const restorePost = async (
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

    const ok = await restorePostService(id);
    if (!ok) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.status(200).json({ message: "Post restored" });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — HARD DELETE
// ==========================================
export const hardDeletePost = async (
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

    const ok = await hardDeletePostService(id);
    if (!ok) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};