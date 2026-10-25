// src/services/Testimonial/testimonial.route.ts
import { Router } from "express";
import {
  listPublishedTestimonials,
  listAllTestimonials,
  getPublishedTestimonialById,
  getTestimonialById,
  getTestimonialStats,
  createTestimonial,
  updateTestimonial,
  toggleTestimonialPublish,
  deleteTestimonial,
} from "./testimonial.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const TestimonialRoute = Router();

// ==========================================
// PUBLIC — READ (only published)
// ==========================================

// GET /api/testimonials — list published only
TestimonialRoute.get("/", listPublishedTestimonials);

// ==========================================
// ADMIN — READ
// ==========================================

// GET /api/testimonials/admin — list all (published + unpublished)
TestimonialRoute.get("/admin", requireAdmin, listAllTestimonials);

// GET /api/testimonials/admin/stats — stats overview
TestimonialRoute.get("/admin/stats", requireAdmin, getTestimonialStats);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/testimonials — create
TestimonialRoute.post("/", requireAdmin, createTestimonial);

// PUT /api/testimonials/:id — update
TestimonialRoute.put("/:id", requireAdmin, updateTestimonial);

// PATCH /api/testimonials/:id/publish — toggle publish
TestimonialRoute.patch("/:id/publish", requireAdmin, toggleTestimonialPublish);

// DELETE /api/testimonials/:id — delete
TestimonialRoute.delete("/:id", requireAdmin, deleteTestimonial);

// ==========================================
// PUBLIC — GET BY ID (only if published)
// ==========================================
TestimonialRoute.get("/:id", getPublishedTestimonialById);