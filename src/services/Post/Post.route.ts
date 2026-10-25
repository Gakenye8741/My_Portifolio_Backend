// src/services/Post/post.route.ts
import { Router } from "express";
import {
  // public reads
  listPosts,
  getPostBySlug,
  // public engagement
  addReaction,
  getReactionCounts,
  ratePost,
  getRatingsSummary,
  // admin read
  getPostById,
  getPostStats,
  listRevisions,
  // admin write
  createPost,
  updatePost,
  togglePublish,
  toggleFeatured,
  deletePost,
  restorePost,
  hardDeletePost,
} from "./Post.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const PostRoute = Router();

// ==========================================
// PUBLIC — READ
// ==========================================

// GET /api/posts — list (paginated, filter by status/tag/featured/search)
PostRoute.get("/", listPosts);

// GET /api/posts/slug/:slug — single post (increments view)
PostRoute.get("/slug/:slug", getPostBySlug);

// ==========================================
// PUBLIC — ENGAGEMENT
// ==========================================

// POST /api/posts/:id/reactions — add a reaction (like/love/fire/clap/mind_blown)
PostRoute.post("/:id/reactions", addReaction);

// GET /api/posts/:id/reactions — aggregated reaction counts
PostRoute.get("/:id/reactions", getReactionCounts);

// POST /api/posts/:id/ratings — rate 1-5 (unique per visitorId)
PostRoute.post("/:id/ratings", ratePost);

// GET /api/posts/:id/ratings — ratings summary (avg, count, distribution)
PostRoute.get("/:id/ratings", getRatingsSummary);

// ==========================================
// ADMIN — READ (must be before /:id catch-all)
// ==========================================

// GET /api/posts/admin/stats — dashboard stats
PostRoute.get("/admin/stats", requireAdmin, getPostStats);

// GET /api/posts/:id/revisions — version history
PostRoute.get("/:id/revisions", requireAdmin, listRevisions);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/posts — create
PostRoute.post("/", requireAdmin, createPost);

// PUT /api/posts/:id — update (creates a revision)
PostRoute.put("/:id", requireAdmin, updatePost);

// PATCH /api/posts/:id/publish — toggle publish
PostRoute.patch("/:id/publish", requireAdmin, togglePublish);

// PATCH /api/posts/:id/featured — toggle featured
PostRoute.patch("/:id/featured", requireAdmin, toggleFeatured);

// DELETE /api/posts/:id — soft delete
PostRoute.delete("/:id", requireAdmin, deletePost);

// POST /api/posts/:id/restore — undo soft delete
PostRoute.post("/:id/restore", requireAdmin, restorePost);

// DELETE /api/posts/:id/hard — permanent delete
PostRoute.delete("/:id/hard", requireAdmin, hardDeletePost);

// ==========================================
// ADMIN — GET BY ID (LAST — catch-all)
// ==========================================
PostRoute.get("/:id", requireAdmin, getPostById);