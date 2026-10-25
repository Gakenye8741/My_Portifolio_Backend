// src/services/Contact/contact.route.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  // public
  submitContactForm,
  // admin
  listMessages,
  getMessageById,
  getMessageStats,
  updateMessageStatus,
  markMessageRead,
  markMessageReplied,
  deleteMessage,
} from "./contact.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

// ==========================================
// RATE LIMITER — prevents spam on public form
// ==========================================
const contactRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,      // 15 minutes
  max: 50,                         // max 5 submissions per IP per window
  message: {
    error: "Too many contact form submissions. Please try again in 15 minutes.",
  },
  standardHeaders: true,          // return RateLimit-* headers
  legacyHeaders: false,           // disable X-RateLimit-* headers
  // keyGenerator: (req) => req.ip || "unknown",
});

// ==========================================
// ROUTERS
// ==========================================
export const ContactRoute = Router();
export const MessagesRoute = Router();

// ==========================================
// PUBLIC — CONTACT FORM
// Mount as: app.use("/api/contact", ContactRoute)
// ==========================================

// POST /api/contact — submit contact form (rate-limited)
ContactRoute.post("/", contactRateLimiter, submitContactForm);

// ==========================================
// ADMIN — MESSAGES INBOX
// Mount as: app.use("/api/messages", MessagesRoute)
// ==========================================

// GET /api/messages — list all (paginated, filterable)
MessagesRoute.get("/", requireAdmin, listMessages);

// GET /api/messages/admin/stats — inbox stats (MUST be before /:id)
MessagesRoute.get("/admin/stats", requireAdmin, getMessageStats);

// GET /api/messages/:id — single message
MessagesRoute.get("/:id", requireAdmin, getMessageById);

// PUT /api/messages/:id/status — update status (new/read/replied/archived)
MessagesRoute.put("/:id/status", requireAdmin, updateMessageStatus);

// PUT /api/messages/:id/read — quick mark-read
MessagesRoute.put("/:id/read", requireAdmin, markMessageRead);

// PUT /api/messages/:id/replied — mark as replied
MessagesRoute.put("/:id/replied", requireAdmin, markMessageReplied);

// DELETE /api/messages/:id — delete message
MessagesRoute.delete("/:id", requireAdmin, deleteMessage);