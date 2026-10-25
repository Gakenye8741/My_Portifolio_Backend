// src/services/Testimonial/testimonial.service.ts
import { and, desc, eq, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  testimonials,
  mediaAssets,
  TSelectTestimonial,
  TSelectMedia,
} from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TTestimonialFilters = {
  isPublished?: boolean;
  minRating?: number;
  search?: string;
  sortBy?: "createdAt" | "rating" | "authorName";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedTestimonials = {
  data: TTestimonialWithAvatar[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TCreateTestimonialInput = {
  authorName: string;
  authorRole?: string | null;
  company?: string | null;
  content: string;
  rating?: number | null;
  sourceUrl?: string | null;
  authorAvatarId?: string | null;
  isPublished?: boolean;
};

export type TUpdateTestimonialInput = Partial<TCreateTestimonialInput>;

export type TTestimonialWithAvatar = TSelectTestimonial & {
  avatar: TSelectMedia | null;
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const MIN_RATING = 1;
const MAX_RATING = 5;

// ==========================================
// VALIDATION
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

const validateRating = (value: number | undefined | null) => {
  if (value === undefined || value === null) return;
  if (!Number.isInteger(value) || value < MIN_RATING || value > MAX_RATING) {
    throw new Error(`rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`);
  }
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==========================================
// INTERNAL — shape row
// ==========================================
type TRawTestimonialRow = TSelectTestimonial & {
  avatar: TSelectMedia | null;
};

const shapeTestimonial = (
  row: TRawTestimonialRow
): TTestimonialWithAvatar => ({
  ...row,
  avatar: row.avatar ?? null,
});

// ==========================================
// INTERNAL — fetch by id with avatar
// ==========================================
const fetchTestimonialFullById = async (
  id: string
): Promise<TTestimonialWithAvatar | null> => {
  const row = await db.query.testimonials.findFirst({
    where: eq(testimonials.id, id),
    with: { avatar: true },
  });

  if (!row) return null;
  return shapeTestimonial(row as TRawTestimonialRow);
};

// ==========================================
// READ — LIST
// ==========================================
export const listTestimonialsService = async (
  filters: TTestimonialFilters = {}
): Promise<TPaginatedTestimonials> => {
  const {
    isPublished,
    minRating,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const whereConditions = [];

  if (isPublished !== undefined) {
    whereConditions.push(eq(testimonials.isPublished, isPublished));
  }

  if (minRating !== undefined) {
    whereConditions.push(sql`${testimonials.rating} >= ${minRating}`);
  }

  if (search && search.trim()) {
    whereConditions.push(
      sql`(${testimonials.authorName} ILIKE ${`%${search.trim()}%`} OR ${testimonials.content} ILIKE ${`%${search.trim()}%`} OR ${testimonials.company} ILIKE ${`%${search.trim()}%`})`
    );
  }

  const where =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const sortColumn =
    sortBy === "rating"
      ? testimonials.rating
      : sortBy === "authorName"
        ? testimonials.authorName
        : testimonials.id; // fallback (no createdAt on testimonials schema)

  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(testimonials)
      .where(where),
    db.query.testimonials.findMany({
      where,
      with: { avatar: true },
      orderBy: [sql`${sortColumn} ${orderDirection}`],
      limit: safeLimit,
      offset,
    }),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: rows.map((r) => shapeTestimonial(r as TRawTestimonialRow)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
};

// ==========================================
// READ — BY ID
// ==========================================
export const getTestimonialByIdService = async (
  id: string
): Promise<TTestimonialWithAvatar | null> => {
  return fetchTestimonialFullById(id);
};

// ==========================================
// READ — STATS
// ==========================================
export const getTestimonialStatsService = async (): Promise<{
  total: number;
  published: number;
  unpublished: number;
  avgRating: number;
}> => {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      published: sql<number>`COUNT(*) FILTER (WHERE ${testimonials.isPublished} = true)::int`,
      unpublished: sql<number>`COUNT(*) FILTER (WHERE ${testimonials.isPublished} = false)::int`,
      avgRating: sql<number>`COALESCE(AVG(${testimonials.rating}), 0)::numeric(3,2)`,
    })
    .from(testimonials);

  return {
    total: row?.total ?? 0,
    published: row?.published ?? 0,
    unpublished: row?.unpublished ?? 0,
    avgRating: Number(row?.avgRating ?? 0),
  };
};

// ==========================================
// CREATE
// ==========================================
export const createTestimonialService = async (
  input: TCreateTestimonialInput
): Promise<TTestimonialWithAvatar> => {
  assertNonEmpty(input.authorName, "Author name");
  assertLength(input.authorName, 100, "Author name");
  assertNonEmpty(input.content, "Content");

  if (input.authorRole) {
    assertLength(input.authorRole, 100, "Author role");
  }
  if (input.company) {
    assertLength(input.company, 100, "Company");
  }

  validateRating(input.rating);

  if (input.sourceUrl) {
    assertLength(input.sourceUrl, 500, "sourceUrl");
    if (!isValidUrl(input.sourceUrl)) {
      throw new Error("sourceUrl must be a valid URL");
    }
  }

  // verify avatar (media) exists if provided
  if (input.authorAvatarId) {
    const media = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, input.authorAvatarId),
    });
    if (!media) {
      throw new Error("Avatar media not found");
    }
  }

  const [created] = await db
    .insert(testimonials)
    .values({
      authorName: input.authorName.trim(),
      authorRole: input.authorRole?.trim() || null,
      company: input.company?.trim() || null,
      content: input.content.trim(),
      rating: input.rating ?? null,
      sourceUrl: input.sourceUrl?.trim() || null,
      authorAvatarId: input.authorAvatarId ?? null,
      isPublished: input.isPublished ?? false,
    })
    .returning();

  const full = await fetchTestimonialFullById(created.id);
  return full!;
};

// ==========================================
// UPDATE
// ==========================================
export const updateTestimonialService = async (
  id: string,
  input: TUpdateTestimonialInput
): Promise<TTestimonialWithAvatar | null> => {
  const existing = await fetchTestimonialFullById(id);
  if (!existing) return null;

  if (input.authorName !== undefined) {
    assertNonEmpty(input.authorName, "Author name");
    assertLength(input.authorName, 100, "Author name");
  }
  if (input.content !== undefined) {
    assertNonEmpty(input.content, "Content");
  }
  if (input.authorRole !== undefined && input.authorRole !== null) {
    assertLength(input.authorRole, 100, "Author role");
  }
  if (input.company !== undefined && input.company !== null) {
    assertLength(input.company, 100, "Company");
  }

  validateRating(input.rating);

  if (input.sourceUrl !== undefined && input.sourceUrl !== null) {
    assertLength(input.sourceUrl, 500, "sourceUrl");
    if (!isValidUrl(input.sourceUrl)) {
      throw new Error("sourceUrl must be a valid URL");
    }
  }

  if (input.authorAvatarId !== undefined && input.authorAvatarId !== null) {
    const media = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, input.authorAvatarId),
    });
    if (!media) {
      throw new Error("Avatar media not found");
    }
  }

  await db
    .update(testimonials)
    .set({
      authorName: input.authorName?.trim() ?? existing.authorName,
      authorRole:
        input.authorRole !== undefined
          ? input.authorRole?.trim() || null
          : existing.authorRole,
      company:
        input.company !== undefined
          ? input.company?.trim() || null
          : existing.company,
      content: input.content?.trim() ?? existing.content,
      rating:
        input.rating !== undefined ? input.rating : existing.rating,
      sourceUrl:
        input.sourceUrl !== undefined
          ? input.sourceUrl?.trim() || null
          : existing.sourceUrl,
      authorAvatarId:
        input.authorAvatarId !== undefined
          ? input.authorAvatarId
          : existing.authorAvatarId,
      isPublished:
        input.isPublished !== undefined
          ? input.isPublished
          : existing.isPublished,
    })
    .where(eq(testimonials.id, id));

  return fetchTestimonialFullById(id);
};

// ==========================================
// TOGGLE PUBLISH
// ==========================================
export const togglePublishTestimonialService = async (
  id: string
): Promise<TTestimonialWithAvatar | null> => {
  const existing = await fetchTestimonialFullById(id);
  if (!existing) return null;

  await db
    .update(testimonials)
    .set({ isPublished: !existing.isPublished })
    .where(eq(testimonials.id, id));

  return fetchTestimonialFullById(id);
};

// ==========================================
// DELETE
// ==========================================
export const deleteTestimonialService = async (
  id: string
): Promise<boolean> => {
  const existing = await fetchTestimonialFullById(id);
  if (!existing) return false;

  await db.delete(testimonials).where(eq(testimonials.id, id));
  return true;
};