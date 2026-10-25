// src/services/Service/service.service.ts
import { and, desc, eq, isNull, sql, inArray } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  services,
  serviceTechnologies,
  technologies,
  TSelectService,
  TSelectTech,
} from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TPricingType = "hourly" | "fixed" | "contact";

export type TServiceFilters = {
  search?: string;
  pricingType?: TPricingType;
  isAvailable?: boolean;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedServices = {
  data: TSelectService[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TCreateServiceInput = {
  title: string;
  slug?: string;
  description: string;
  iconName?: string | null;
  pricingType?: TPricingType;
  isAvailable?: boolean;
  techIds?: string[];
};

export type TUpdateServiceInput = Partial<TCreateServiceInput>;

export type TServiceWithTechs = TSelectService & {
  techStack: TSelectTech[];
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const VALID_PRICING: TPricingType[] = ["hourly", "fixed", "contact"];

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
// SLUG HELPERS
// ==========================================
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureUniqueSlug = async (
  base: string,
  excludeId?: string
): Promise<string> => {
  if (!base) throw new Error("Cannot generate slug from empty title");

  let slug = base;
  let n = 1;

  while (n < 1000) {
    const existing = await db.query.services.findFirst({
      where: and(
        eq(services.slug, slug),
        excludeId ? sql`${services.id} <> ${excludeId}` : sql`true`
      ),
    });
    if (!existing) return slug;
    slug = `${base}-${n++}`;
  }

  return `${base}-${Date.now()}`;
};

// ==========================================
// INTERNAL — fetch service with techs
// ==========================================
const fetchServiceFullById = async (
  id: string,
  executor: typeof db = db
): Promise<TServiceWithTechs | null> => {
  const service = await executor.query.services.findFirst({
    where: eq(services.id, id),
    with: {
      techStack: { with: { technology: true } },
    },
  });

  if (!service) return null;

  return {
    ...service,
    techStack: (service.techStack ?? [])
      .map((st) => st.technology)
      .filter(Boolean) as TSelectTech[],
  } as TServiceWithTechs;
};

// ==========================================
// READ — LIST
// ==========================================
export const listServicesService = async (
  filters: TServiceFilters = {}
): Promise<TPaginatedServices> => {
  const {
    search,
    pricingType,
    isAvailable,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const whereConditions = [];

  if (search && search.trim()) {
    whereConditions.push(
      sql`(${services.title} ILIKE ${`%${search.trim()}%`} OR ${services.description} ILIKE ${`%${search.trim()}%`})`
    );
  }

  if (pricingType) {
    whereConditions.push(eq(services.pricingType, pricingType));
  }

  if (isAvailable !== undefined) {
    whereConditions.push(eq(services.isAvailable, isAvailable));
  }

  const where =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const sortColumn = sortBy === "title" ? services.title : services.id;
  // services has no createdAt; use id as fallback
  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(services)
      .where(where),
    db.query.services.findMany({
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
// READ — BY SLUG
// ==========================================
export const getServiceBySlugService = async (
  slug: string
): Promise<TServiceWithTechs | null> => {
  const service = await db.query.services.findFirst({
    where: eq(services.slug, slug),
    with: {
      techStack: { with: { technology: true } },
    },
  });

  if (!service) return null;

  return {
    ...service,
    techStack: (service.techStack ?? [])
      .map((st) => st.technology)
      .filter(Boolean) as TSelectTech[],
  } as TServiceWithTechs;
};

// ==========================================
// READ — BY ID
// ==========================================
export const getServiceByIdService = async (
  id: string
): Promise<TServiceWithTechs | null> => {
  return fetchServiceFullById(id);
};

// ==========================================
// CREATE
// ==========================================
export const createServiceService = async (
  input: TCreateServiceInput
): Promise<TServiceWithTechs> => {
  assertNonEmpty(input.title, "Title");
  assertLength(input.title, 100, "Title");
  assertNonEmpty(input.description, "Description");

  if (input.slug) assertLength(input.slug, 100, "Slug");
  if (input.iconName) assertLength(input.iconName, 50, "iconName");

  if (input.pricingType && !VALID_PRICING.includes(input.pricingType)) {
    throw new Error(`pricingType must be one of: ${VALID_PRICING.join(", ")}`);
  }

  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title);
  const slug = await ensureUniqueSlug(baseSlug);

  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(services)
      .values({
        title: input.title.trim(),
        slug,
        description: input.description.trim(),
        iconName: input.iconName ?? null,
        pricingType: input.pricingType ?? "contact",
        isAvailable: input.isAvailable ?? true,
      })
      .returning();

    if (input.techIds && input.techIds.length > 0) {
      const uniqueIds = Array.from(new Set(input.techIds));
      await tx.insert(serviceTechnologies).values(
        uniqueIds.map((techId) => ({
          serviceId: created.id,
          technologyId: techId,
        }))
      );
    }

    const full = await fetchServiceFullById(
      created.id,
      tx as unknown as typeof db
    );
    return full!;
  });
};

// ==========================================
// UPDATE
// ==========================================
export const updateServiceService = async (
  id: string,
  input: TUpdateServiceInput
): Promise<TServiceWithTechs | null> => {
  const existing = await getServiceByIdService(id);
  if (!existing) return null;

  if (input.title !== undefined) {
    assertNonEmpty(input.title, "Title");
    assertLength(input.title, 100, "Title");
  }
  if (input.description !== undefined) {
    assertNonEmpty(input.description, "Description");
  }
  if (input.pricingType && !VALID_PRICING.includes(input.pricingType)) {
    throw new Error(`pricingType must be one of: ${VALID_PRICING.join(", ")}`);
  }

  let slug = existing.slug;
  if (input.title !== undefined || input.slug !== undefined) {
    const base = input.slug ? slugify(input.slug) : slugify(input.title!);
    slug = await ensureUniqueSlug(base, id);
  }

  return await db.transaction(async (tx) => {
    await tx
      .update(services)
      .set({
        title: input.title?.trim() ?? existing.title,
        slug,
        description: input.description?.trim() ?? existing.description,
        iconName:
          input.iconName !== undefined ? input.iconName : existing.iconName,
        pricingType: input.pricingType ?? existing.pricingType,
        isAvailable:
          input.isAvailable !== undefined
            ? input.isAvailable
            : existing.isAvailable,
      })
      .where(eq(services.id, id));

    if (input.techIds) {
      await tx
        .delete(serviceTechnologies)
        .where(eq(serviceTechnologies.serviceId, id));
      if (input.techIds.length > 0) {
        const uniqueIds = Array.from(new Set(input.techIds));
        await tx.insert(serviceTechnologies).values(
          uniqueIds.map((techId) => ({
            serviceId: id,
            technologyId: techId,
          }))
        );
      }
    }

    const full = await fetchServiceFullById(id, tx as unknown as typeof db);
    return full!;
  });
};

// ==========================================
// DELETE
// ==========================================
export const deleteServiceService = async (id: string): Promise<boolean> => {
  const existing = await getServiceByIdService(id);
  if (!existing) return false;

  await db.delete(services).where(eq(services.id, id));
  return true;
};

// ==========================================
// TOGGLE AVAILABILITY
// ==========================================
export const toggleServiceAvailabilityService = async (
  id: string
): Promise<TSelectService | null> => {
  const [row] = await db
    .update(services)
    .set({ isAvailable: sql`NOT ${services.isAvailable}` })
    .where(eq(services.id, id))
    .returning();

  return row ?? null;
};

// ==========================================
// BULK GET BY IDS (useful for admin UI)
// ==========================================
export const getServicesByIdsService = async (
  ids: string[]
): Promise<TSelectService[]> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  return db.select().from(services).where(inArray(services.id, uniqueIds));
};