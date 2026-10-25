// src/services/Media/media.service.ts
import { desc, eq, inArray, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  mediaAssets,
  projects,
  projectSections,
  posts,
  testimonials,
  certifications,
  seoMetadata,
  pageContentMedia,
  TInsertMedia,
  TSelectMedia,
} from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TCreateMediaInput = {
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  hash?: string | null;
  publicId?: string | null;
};

export type TMediaFilters = {
  search?: string;
  fileType?: string;
  sortBy?: "createdAt" | "fileName" | "fileSize";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedMedia = {
  data: TSelectMedia[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TMediaUsage = {
  projects: { id: string; title: string; field: "thumbnail" }[];
  sections: { id: string; projectId: string; field: "media" }[];
  posts: { id: string; title: string; field: "coverImage" }[];
  testimonials: { id: string; authorName: string; field: "avatar" }[];
  certifications: { id: string; name: string; field: "badge" }[];
  seo: { id: string; pageType: string; field: "ogImage" }[];
  pageContent: { id: string; contentId: string; field: "media" }[];
};

// ==========================================
// VALIDATION
// ==========================================
const MAX_LIMIT = 200;
const MIN_LIMIT = 1;

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

const assertUrl = (url: string) => {
  try {
    new URL(url);
  } catch {
    throw new Error("fileUrl must be a valid URL");
  }
};

// ==========================================
// CREATE
// ==========================================
export const createMediaService = async (
  input: TCreateMediaInput
): Promise<TSelectMedia> => {
  // validate
  assertNonEmpty(input.fileName, "fileName");
  assertLength(input.fileName, 255, "fileName");

  assertNonEmpty(input.fileUrl, "fileUrl");
  assertUrl(input.fileUrl);

  if (input.fileType) {
    assertLength(input.fileType, 50, "fileType");
  }

  if (input.fileSize !== undefined && input.fileSize !== null) {
    if (!Number.isInteger(input.fileSize) || input.fileSize < 0) {
      throw new Error("fileSize must be a non-negative integer");
    }
  }

  if (input.hash) {
    assertLength(input.hash, 64, "hash");
  }

  if (input.publicId) {
    assertLength(input.publicId, 255, "publicId");
  }

  // dedupe by hash (optional — if a hash is provided)
  if (input.hash) {
    const existing = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.hash, input.hash),
    });
    if (existing) {
      return existing;
    }
  }

  const [created] = await db
    .insert(mediaAssets)
    .values({
      fileName: input.fileName.trim(),
      fileUrl: input.fileUrl.trim(),
      fileType: input.fileType ?? null,
      fileSize: input.fileSize ?? null,
      hash: input.hash ?? null,
      publicId: input.publicId ?? null,
    })
    .returning();

  return created;
};

// ==========================================
// LIST (paginated + filters)
// ==========================================
export const getAllMediaService = async (
  filters: TMediaFilters = {}
): Promise<TPaginatedMedia> => {
  const {
    search,
    fileType,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  // build where
  const whereConditions = [];

  if (search && search.trim()) {
    whereConditions.push(
      sql`${mediaAssets.fileName} ILIKE ${`%${search.trim()}%`}`
    );
  }

  if (fileType && fileType.trim()) {
    whereConditions.push(
      sql`${mediaAssets.fileType} ILIKE ${`%${fileType.trim()}%`}`
    );
  }

  const where =
    whereConditions.length > 0
      ? sql.join(whereConditions, sql` AND `)
      : undefined;

  // sort
  const sortColumn =
    sortBy === "fileName"
      ? mediaAssets.fileName
      : sortBy === "fileSize"
        ? mediaAssets.fileSize
        : mediaAssets.createdAt;

  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  // count + data in parallel
  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(mediaAssets)
      .where(where),
    db.query.mediaAssets.findMany({
      where,
      orderBy: [sql`${sortColumn} ${orderDirection}`],
      limit: safeLimit,
      offset,
    }),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    data,
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
// GET BY ID
// ==========================================
export const getMediaByIdService = async (
  id: string
): Promise<TSelectMedia | null> => {
  const asset = await db.query.mediaAssets.findFirst({
    where: eq(mediaAssets.id, id),
  });
  return asset ?? null;
};

// ==========================================
// BULK GET (dedupe input ids)
// ==========================================
export const getBulkMediaService = async (
  ids: string[]
): Promise<TSelectMedia[]> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  return db.select().from(mediaAssets).where(inArray(mediaAssets.id, uniqueIds));
};

// ==========================================
// CHECK USAGE (for admin UI to warn before delete)
// ==========================================
export const checkMediaUsageService = async (
  id: string
): Promise<TMediaUsage> => {
  const [
    projectsUsing,
    sectionsUsing,
    postsUsing,
    testimonialsUsing,
    certificationsUsing,
    seoUsing,
    pageContentUsing,
  ] = await Promise.all([
    db.query.projects.findMany({
      where: eq(projects.mainThumbnailId, id),
      columns: { id: true, title: true },
    }),
    db.query.projectSections.findMany({
      where: eq(projectSections.mediaId, id),
      columns: { id: true, projectId: true },
    }),
    db.query.posts.findMany({
      where: eq(posts.coverImageId, id),
      columns: { id: true, title: true },
    }),
    db.query.testimonials.findMany({
      where: eq(testimonials.authorAvatarId, id),
      columns: { id: true, authorName: true },
    }),
    db.query.certifications.findMany({
      where: eq(certifications.badgeMediaId, id),
      columns: { id: true, name: true },
    }),
    db.query.seoMetadata.findMany({
      where: eq(seoMetadata.ogImageId, id),
      columns: { id: true, pageType: true },
    }),
    db.query.pageContentMedia.findMany({
      where: eq(pageContentMedia.mediaId, id),
      columns: { id: true, contentId: true },
    }),
  ]);

  return {
    projects: projectsUsing.map((p) => ({ ...p, field: "thumbnail" as const })),
    sections: sectionsUsing.map((s) => ({ ...s, field: "media" as const })),
    posts: postsUsing.map((p) => ({ ...p, field: "coverImage" as const })),
    testimonials: testimonialsUsing.map((t) => ({
      ...t,
      field: "avatar" as const,
    })),
    certifications: certificationsUsing.map((c) => ({
      ...c,
      field: "badge" as const,
    })),
    seo: seoUsing.map((s) => ({ ...s, field: "ogImage" as const })),
    pageContent: pageContentUsing.map((p) => ({
      ...p,
      field: "media" as const,
    })),
  };
};

// ==========================================
// UPDATE (whitelisted fields only)
// ==========================================
export const updateMediaService = async (
  id: string,
  input: Partial<TCreateMediaInput>
): Promise<TSelectMedia | null> => {
  const existing = await getMediaByIdService(id);
  if (!existing) return null;

  // validate any changed fields
  if (input.fileName !== undefined) {
    assertNonEmpty(input.fileName, "fileName");
    assertLength(input.fileName, 255, "fileName");
  }
  if (input.fileUrl !== undefined) {
    assertNonEmpty(input.fileUrl, "fileUrl");
    assertUrl(input.fileUrl);
  }
  if (input.fileType !== undefined && input.fileType !== null) {
    assertLength(input.fileType, 50, "fileType");
  }
  if (input.publicId !== undefined && input.publicId !== null) {
    assertLength(input.publicId, 255, "publicId");
  }

  const [updated] = await db
    .update(mediaAssets)
    .set({
      fileName: input.fileName?.trim() ?? existing.fileName,
      fileUrl: input.fileUrl?.trim() ?? existing.fileUrl,
      fileType:
        input.fileType !== undefined ? input.fileType : existing.fileType,
      fileSize:
        input.fileSize !== undefined ? input.fileSize : existing.fileSize,
      hash: input.hash !== undefined ? input.hash : existing.hash,
      publicId:
        input.publicId !== undefined ? input.publicId : existing.publicId,
    })
    .where(eq(mediaAssets.id, id))
    .returning();

  return updated ?? null;
};

// ==========================================
// DELETE
// ==========================================
// Because your schema uses `onDelete: "set null"` on every FK pointing to
// mediaAssets, deleting a media row automatically nulls those references.
// So this is SAFE — no need to block. We just delete.
export const deleteMediaService = async (id: string): Promise<boolean> => {
  const existing = await getMediaByIdService(id);
  if (!existing) return false;

  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return true;
};