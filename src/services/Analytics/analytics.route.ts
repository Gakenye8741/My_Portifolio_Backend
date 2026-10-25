// src/services/Analytics/analytics.route.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  recordPageView,
  getTodayStats,
  getSummary,
  getTopPages,
  getTimeseries,
  getPathStats,
  cleanupOldPageViews,
} from "./analytics.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

// ==========================================
// RATE LIMITER — prevents count inflation
// ==========================================
const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,              // max 100 page views per IP per minute
  message: { error: "Too many page views recorded. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const AnalyticsRoute = Router();

// ==========================================
// PUBLIC — RECORD A VIEW
// ==========================================

// POST /api/analytics/pageview — record a view (rate-limited)
AnalyticsRoute.post("/pageview", analyticsRateLimiter, recordPageView);

// ==========================================
// ADMIN — READ
// ==========================================

// GET /api/analytics/today
AnalyticsRoute.get("/today", requireAdmin, getTodayStats);

// GET /api/analytics/summary
AnalyticsRoute.get("/summary", requireAdmin, getSummary);

// GET /api/analytics/pages?days=7&limit=10
AnalyticsRoute.get("/pages", requireAdmin, getTopPages);

// GET /api/analytics/timeseries?days=30
AnalyticsRoute.get("/timeseries", requireAdmin, getTimeseries);

// GET /api/analytics/path?path=/projects/foo&days=30
AnalyticsRoute.get("/path", requireAdmin, getPathStats);

// ==========================================
// ADMIN — MAINTENANCE
// ==========================================

// DELETE /api/analytics/cleanup?olderThanDays=365
AnalyticsRoute.delete("/cleanup", requireAdmin, cleanupOldPageViews);