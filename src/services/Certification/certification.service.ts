// src/services/Certification/certification.service.ts
import { and, eq, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  certifications,
  mediaAssets,
  TSelectCertification,
  TSelectMedia,
} from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TCertificationFilters = {
  search?: string;
  issuer?: string;
  sortBy?: "name" | "issuer";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedCertifications = {
  data: TCertificationWithBadge[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TCreateCertificationInput = {
  name: string;
  issuer: string;
  badgeMediaId?: string | null;
};

export type TUpdateCertificationInput = Partial<TCreateCertificationInput>;

export type TCertificationWithBadge = TSelectCertification & {
  badge: TSelectMedia | null;
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

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

// ==========================================
// INTERNAL — shape row
// ==========================================
type TRawCertificationRow = TSelectCertification & {
  badge: TSelectMedia | null;
};

const shapeCertification = (
  row: TRawCertificationRow
): TCertificationWithBadge => ({
  ...row,
  badge: row.badge ?? null,
});

// ==========================================
// INTERNAL — fetch by id with badge
// ==========================================
const fetchCertificationFullById = async (
  id: string
): Promise<TCertificationWithBadge | null> => {
  const row = await db.query.certifications.findFirst({
    where: eq(certifications.id, id),
    with: { badge: true },
  });

  if (!row) return null;
  return shapeCertification(row as TRawCertificationRow);
};

// ==========================================
// READ — LIST
// ==========================================
export const listCertificationsService = async (
  filters: TCertificationFilters = {}
): Promise<TPaginatedCertifications> => {
  const {
    search,
    issuer,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    limit = 50,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const whereConditions = [];

  if (search && search.trim()) {
    whereConditions.push(
      sql`(${certifications.name} ILIKE ${`%${search.trim()}%`} OR ${certifications.issuer} ILIKE ${`%${search.trim()}%`})`
    );
  }

  if (issuer && issuer.trim()) {
    whereConditions.push(
      sql`${certifications.issuer} ILIKE ${`%${issuer.trim()}%`}`
    );
  }

  const where =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const sortColumn =
    sortBy === "issuer" ? certifications.issuer : certifications.name;
  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(certifications)
      .where(where),
    db.query.certifications.findMany({
      where,
      with: { badge: true },
      orderBy: [sql`${sortColumn} ${orderDirection}`],
      limit: safeLimit,
      offset,
    }),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: rows.map((r) => shapeCertification(r as TRawCertificationRow)),
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
export const getCertificationByIdService = async (
  id: string
): Promise<TCertificationWithBadge | null> => {
  return fetchCertificationFullById(id);
};

// ==========================================
// READ — STATS
// ==========================================
export const getCertificationStatsService = async (): Promise<{
  total: number;
  withBadge: number;
  withoutBadge: number;
  issuers: string[];
}> => {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      withBadge: sql<number>`COUNT(*) FILTER (WHERE ${certifications.badgeMediaId} IS NOT NULL)::int`,
      withoutBadge: sql<number>`COUNT(*) FILTER (WHERE ${certifications.badgeMediaId} IS NULL)::int`,
    })
    .from(certifications);

  const issuerRows = await db
    .selectDistinct({ issuer: certifications.issuer })
    .from(certifications)
    .orderBy(certifications.issuer);

  return {
    total: row?.total ?? 0,
    withBadge: row?.withBadge ?? 0,
    withoutBadge: row?.withoutBadge ?? 0,
    issuers: issuerRows.map((r) => r.issuer),
  };
};

// ==========================================
// CREATE
// ==========================================
export const createCertificationService = async (
  input: TCreateCertificationInput
): Promise<TCertificationWithBadge> => {
  assertNonEmpty(input.name, "Name");
  assertLength(input.name, 255, "Name");
  assertNonEmpty(input.issuer, "Issuer");
  assertLength(input.issuer, 255, "Issuer");

  // verify badge media exists if provided
  if (input.badgeMediaId) {
    const media = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, input.badgeMediaId),
    });
    if (!media) {
      throw new Error("Badge media not found");
    }
  }

  const [created] = await db
    .insert(certifications)
    .values({
      name: input.name.trim(),
      issuer: input.issuer.trim(),
      badgeMediaId: input.badgeMediaId ?? null,
    })
    .returning();

  const full = await fetchCertificationFullById(created.id);
  return full!;
};

// ==========================================
// UPDATE
// ==========================================
export const updateCertificationService = async (
  id: string,
  input: TUpdateCertificationInput
): Promise<TCertificationWithBadge | null> => {
  const existing = await fetchCertificationFullById(id);
  if (!existing) return null;

  if (input.name !== undefined) {
    assertNonEmpty(input.name, "Name");
    assertLength(input.name, 255, "Name");
  }
  if (input.issuer !== undefined) {
    assertNonEmpty(input.issuer, "Issuer");
    assertLength(input.issuer, 255, "Issuer");
  }

  if (input.badgeMediaId !== undefined && input.badgeMediaId !== null) {
    const media = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, input.badgeMediaId),
    });
    if (!media) {
      throw new Error("Badge media not found");
    }
  }

  await db
    .update(certifications)
    .set({
      name: input.name?.trim() ?? existing.name,
      issuer: input.issuer?.trim() ?? existing.issuer,
      badgeMediaId:
        input.badgeMediaId !== undefined
          ? input.badgeMediaId
          : existing.badgeMediaId,
    })
    .where(eq(certifications.id, id));

  return fetchCertificationFullById(id);
};

// ==========================================
// DELETE
// ==========================================
export const deleteCertificationService = async (
  id: string
): Promise<boolean> => {
  const existing = await fetchCertificationFullById(id);
  if (!existing) return false;

  await db.delete(certifications).where(eq(certifications.id, id));
  return true;
};