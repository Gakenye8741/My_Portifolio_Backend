// src/services/Analytics/analytics.service.ts
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import { pageViews, TSelectPageView } from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TRecordPageViewInput = {
  path: string;
};

export type TTodayStats = {
  day: string;         // YYYY-MM-DD
  total: number;
  topPage: { path: string; count: number } | null;
};

export type TSummary = {
  totalViews: number;
  uniquePaths: number;
  daysTracked: number;
  firstTracked: string | null;
  lastTracked: string | null;
};

export type TTopPage = {
  path: string;
  count: number;
};

export type TTimeseriesPoint = {
  day: string;   // YYYY-MM-DD
  count: number;
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_PATH_LENGTH = 255;
const MAX_TOP_PAGES = 50;
const MAX_DAYS = 365;
const MIN_DAYS = 1;

// ==========================================
// HELPERS
// ==========================================
const assertNonEmpty = (value: string | undefined | null, field: string) => {
  if (!value || !value.trim()) {
    throw new Error(`${field} is required`);
  }
};

const assertLength = (value: string, max: number, field: string) => {
  if (value.length > max) {
    throw new Error(`${field} must be at most ${max} characters`);
  }
};

/**
 * Returns today's date as a YYYY-MM-DD string (UTC).
 * Postgres `date` columns expect this format.
 */
const todayUTC = (): string => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * Returns a YYYY-MM-DD string N days ago (UTC).
 */
const daysAgoUTC = (n: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * Normalizes a path: strips query string, trailing slash, enforces leading slash.
 */
const normalizePath = (raw: string): string => {
  let path = raw.trim();

  // strip query string and hash
  const qIdx = path.indexOf("?");
  if (qIdx >= 0) path = path.slice(0, qIdx);
  const hIdx = path.indexOf("#");
  if (hIdx >= 0) path = path.slice(0, hIdx);

  // ensure leading slash
  if (!path.startsWith("/")) path = "/" + path;

  // strip trailing slash (except for root "/")
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path;
};

// ==========================================
// WRITE — record a single page view (upsert)
// ==========================================
export const recordPageViewService = async (
  input: TRecordPageViewInput
): Promise<{ path: string; day: string; count: number }> => {
  assertNonEmpty(input.path, "path");

  const path = normalizePath(input.path);
  assertLength(path, MAX_PATH_LENGTH, "path");

  // block API routes from analytics — they're not real page views
  if (path.startsWith("/api/")) {
    throw new Error("Cannot track /api/* paths");
  }

  const day = todayUTC();

  // upsert: insert if new (count=1), or increment if exists
  const [row] = await db
    .insert(pageViews)
    .values({ path, day, count: 1 })
    .onConflictDoUpdate({
      target: [pageViews.path, pageViews.day],
      set: { count: sql`${pageViews.count} + 1` },
    })
    .returning();

  return {
    path: row.path,
    day: typeof row.day === "string" ? row.day : String(row.day),
    count: row.count,
  };
};

// ==========================================
// READ — today's stats
// ==========================================
export const getTodayStatsService = async (): Promise<TTodayStats> => {
  const day = todayUTC();

  const [totalRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${pageViews.count}), 0)::int`,
    })
    .from(pageViews)
    .where(eq(pageViews.day, day));

  const [topRow] = await db
    .select({
      path: pageViews.path,
      count: pageViews.count,
    })
    .from(pageViews)
    .where(eq(pageViews.day, day))
    .orderBy(desc(pageViews.count))
    .limit(1);

  return {
    day,
    total: totalRow?.total ?? 0,
    topPage: topRow ?? null,
  };
};

// ==========================================
// READ — overall summary
// ==========================================
export const getSummaryService = async (): Promise<TSummary> => {
  const [row] = await db
    .select({
      totalViews: sql<number>`COALESCE(SUM(${pageViews.count}), 0)::int`,
      uniquePaths: sql<number>`COUNT(DISTINCT ${pageViews.path})::int`,
      daysTracked: sql<number>`COUNT(DISTINCT ${pageViews.day})::int`,
      firstTracked: sql<string | null>`MIN(${pageViews.day})::text`,
      lastTracked: sql<string | null>`MAX(${pageViews.day})::text`,
    })
    .from(pageViews);

  return {
    totalViews: row?.totalViews ?? 0,
    uniquePaths: row?.uniquePaths ?? 0,
    daysTracked: row?.daysTracked ?? 0,
    firstTracked: row?.firstTracked ?? null,
    lastTracked: row?.lastTracked ?? null,
  };
};

// ==========================================
// READ — top pages in last N days
// ==========================================
export const getTopPagesService = async (
  days = 7,
  limit = 10
): Promise<TTopPage[]> => {
  const safeDays = Math.min(Math.max(days, MIN_DAYS), MAX_DAYS);
  const safeLimit = Math.min(Math.max(limit, 1), MAX_TOP_PAGES);

  const fromDay = daysAgoUTC(safeDays - 1);

  const rows = await db
    .select({
      path: pageViews.path,
      count: sql<number>`SUM(${pageViews.count})::int`,
    })
    .from(pageViews)
    .where(gte(pageViews.day, fromDay))
    .groupBy(pageViews.path)
    .orderBy(desc(sql`SUM(${pageViews.count})`))
    .limit(safeLimit);

  return rows;
};

// ==========================================
// READ — daily timeseries (last N days)
// ==========================================
export const getTimeseriesService = async (
  days = 30
): Promise<TTimeseriesPoint[]> => {
  const safeDays = Math.min(Math.max(days, MIN_DAYS), MAX_DAYS);
  const fromDay = daysAgoUTC(safeDays - 1);

  const rows = await db
    .select({
      day: sql<string>`${pageViews.day}::text`,
      count: sql<number>`SUM(${pageViews.count})::int`,
    })
    .from(pageViews)
    .where(gte(pageViews.day, fromDay))
    .groupBy(pageViews.day)
    .orderBy(asc(pageViews.day));

  // fill missing days with zero so the chart is continuous
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const result: TTimeseriesPoint[] = [];

  for (let i = safeDays - 1; i >= 0; i--) {
    const day = daysAgoUTC(i);
    result.push({ day, count: map.get(day) ?? 0 });
  }

  return result;
};

// ==========================================
// READ — single path stats
// ==========================================
export const getPathStatsService = async (
  rawPath: string,
  days = 30
): Promise<{
  path: string;
  total: number;
  today: number;
  timeseries: TTimeseriesPoint[];
}> => {
  assertNonEmpty(rawPath, "path");

  const path = normalizePath(rawPath);
  assertLength(path, MAX_PATH_LENGTH, "path");

  const safeDays = Math.min(Math.max(days, MIN_DAYS), MAX_DAYS);
  const fromDay = daysAgoUTC(safeDays - 1);
  const today = todayUTC();

  const [totalRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${pageViews.count}), 0)::int`,
    })
    .from(pageViews)
    .where(eq(pageViews.path, path));

  const [todayRow] = await db
    .select({
      count: sql<number>`COALESCE(${pageViews.count}, 0)::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.path, path), eq(pageViews.day, today)));

  const rawSeries = await db
    .select({
      day: sql<string>`${pageViews.day}::text`,
      count: pageViews.count,
    })
    .from(pageViews)
    .where(and(eq(pageViews.path, path), gte(pageViews.day, fromDay)))
    .orderBy(asc(pageViews.day));

  const map = new Map(rawSeries.map((r) => [r.day, r.count]));
  const timeseries: TTimeseriesPoint[] = [];

  for (let i = safeDays - 1; i >= 0; i--) {
    const day = daysAgoUTC(i);
    timeseries.push({ day, count: map.get(day) ?? 0 });
  }

  return {
    path,
    total: totalRow?.total ?? 0,
    today: todayRow?.count ?? 0,
    timeseries,
  };
};

// ==========================================
// DELETE — admin cleanup
// ==========================================
export const deletePageViewService = async (id: string): Promise<boolean> => {
  const [deleted] = await db
    .delete(pageViews)
    .where(eq(pageViews.id, id))
    .returning();

  return !!deleted;
};

export const deleteOldPageViewsService = async (
  olderThanDays: number
): Promise<number> => {
  const safeDays = Math.max(olderThanDays, 1);
  const cutoff = daysAgoUTC(safeDays);

  const deleted = await db
    .delete(pageViews)
    .where(sql`${pageViews.day} < ${cutoff}`)
    .returning({ id: pageViews.id });

  return deleted.length;
};