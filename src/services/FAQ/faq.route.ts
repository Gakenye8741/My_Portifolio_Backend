// src/services/FAQ/faq.route.ts
import { Router } from "express";
import {
  listFaqs,
  getFaqById,
  getFaqStats,
  createFaq,
  updateFaq,
  reorderFaqs,
  deleteFaq,
} from "./faq.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const FaqRoute = Router();

// ==========================================
// PUBLIC — READ
// ==========================================

// GET /api/faqs — list (ordered)
FaqRoute.get("/", listFaqs);

// ==========================================
// ADMIN — READ
// ==========================================

// GET /api/faqs/admin/stats — stats
FaqRoute.get("/admin/stats", requireAdmin, getFaqStats);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/faqs — create
FaqRoute.post("/", requireAdmin, createFaq);

// PATCH /api/faqs/reorder — bulk reorder (must be before /:id)
FaqRoute.patch("/reorder", requireAdmin, reorderFaqs);

// PUT /api/faqs/:id — update
FaqRoute.put("/:id", requireAdmin, updateFaq);

// DELETE /api/faqs/:id — delete
FaqRoute.delete("/:id", requireAdmin, deleteFaq);

// ==========================================
// PUBLIC — GET BY ID (LAST — catch-all)
// ==========================================
FaqRoute.get("/:id", getFaqById);