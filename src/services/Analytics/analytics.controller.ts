// src/services/Analytics/analytics.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  recordPageViewService,
  getTodayStatsService,
  getSummaryService,
  getTopPagesService,
  getTimeseriesService,
  getPathStatsService,
  deleteOldPageViewsService,
} from "./analytics.service";

// ==========================================
// HELPERS — safe extraction from Express 5 query
// ==========================================
type TQueryValue = string | string[] | ParsedQs | (string | ParsedQs)[] | undefined | null;

// Loose type so we don't have to import ParsedQs explicitly
type ParsedQs = Record<string, unknown>;

/**
 * Safely turn any query value into a single string (or null).
 * Handles: string, string[], ParsedQs, arrays of mixed, null, undefined.
 */
const getQueryString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    // take first non-empty string
    for (const v of value) {
      if (typeof v === "string" && v.length > 0) return v;
    }
    return null;
  }
  // object (ParsedQs) — not valid for our use cases
  return null;
};

/**
 * Safely turn any query value into a number.
 * Returns null if it can't.
 */
const getQueryNumber = (value: unknown): number | null => {
  const s = getQueryString(value);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const getDaysFromQuery = (
  query: Request["query"],
  defaultDays = 30
): number => {
  const raw = query.days;
  if (raw === undefined) return defaultDays;
  const n = getQueryNumber(raw);
  if (n === null || !Number.isInteger(n) || n < 1 || n > 365) {
    throw new Error("days must be an integer between 1 and 365");
  }
  return n;
};

const getLimitFromQuery = (
  query: Request["query"],
  defaultLimit = 10
): number => {
  const raw = query.limit;
  if (raw === undefined) return defaultLimit;
  const n = getQueryNumber(raw);
  if (n === null || !Number.isInteger(n) || n < 1 || n > 50) {
    throw new Error("limit must be an integer between 1 and 50");
  }
  return n;
};

// ==========================================
// PUBLIC — RECORD A PAGE VIEW
// ==========================================
export const recordPageView = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const path = req.body?.path;

    if (typeof path !== "string" || !path.trim()) {
      res.status(400).json({
        error: "path is required and must be a non-empty string",
      });
      return;
    }

    const result = await recordPageViewService({ path });

    res.status(200).json({
      message: "View recorded",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TODAY'S STATS
// ==========================================
export const getTodayStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getTodayStatsService();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — SUMMARY
// ==========================================
export const getSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await getSummaryService();
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TOP PAGES
// ==========================================
export const getTopPages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = getDaysFromQuery(req.query, 7);
    const limit = getLimitFromQuery(req.query, 10);

    const pages = await getTopPagesService(days, limit);

    res.status(200).json({
      data: pages,
      meta: { days, limit },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — TIMESERIES
// ==========================================
export const getTimeseries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = getDaysFromQuery(req.query, 30);
    const series = await getTimeseriesService(days);

    res.status(200).json({
      data: series,
      meta: { days },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — STATS FOR A SINGLE PATH
// ==========================================
export const getPathStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // path comes from query string (URL-encoded), e.g. ?path=%2Fprojects%2Fmy-app
    const path = getQueryString(req.query.path);

    if (!path || !path.trim()) {
      res.status(400).json({ error: "path query parameter is required" });
      return;
    }

    const days = getDaysFromQuery(req.query, 30);
    const stats = await getPathStatsService(path, days);

    res.status(200).json({
      data: stats,
      meta: { days },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CLEANUP OLD VIEWS
// ==========================================
export const cleanupOldPageViews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw = req.query.olderThanDays;
    const fallback = 365;
    const parsed = raw === undefined ? fallback : getQueryNumber(raw);
    const olderThanDays = parsed ?? fallback;

    if (
      !Number.isInteger(olderThanDays) ||
      olderThanDays < 30 ||
      olderThanDays > 3650
    ) {
      res.status(400).json({
        error: "olderThanDays must be an integer between 30 and 3650",
      });
      return;
    }

    const deleted = await deleteOldPageViewsService(olderThanDays);

    res.status(200).json({
      message: `Deleted ${deleted} old page view rows`,
      data: { deleted, olderThanDays },
    });
  } catch (err) {
    next(err);
  }
};