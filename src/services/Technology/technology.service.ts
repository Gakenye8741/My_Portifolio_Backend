// src/services/Technology/technology.service.ts
import { and, asc, desc, eq, sql, inArray } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  technologies,
  projectTechnologies,
  serviceTechnologies,
  skills,
  TSelectTech,
} from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TTechCategory =
  | "frontend"
  | "backend"
  | "database"
  | "devops"
  | "mobile"
  | "ai";

export type TTechnologyFilters = {
  category?: TTechCategory;
  search?: string;
  sortBy?: "name" | "category";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedTechnologies = {
  data: TSelectTech[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TCreateTechnologyInput = {
  name: string;
  category: TTechCategory;
  iconName?: string | null;
};

export type TUpdateTechnologyInput = Partial<TCreateTechnologyInput>;

export type TTechnologyUsage = {
  projects: number;
  services: number;
  hasSkill: boolean;
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const VALID_CATEGORIES: TTechCategory[] = [
  "frontend",
  "backend",
  "database",
  "devops",
  "mobile",
  "ai",
];

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
// READ — LIST
// ==========================================
export const listTechnologiesService = async (
  filters: TTechnologyFilters = {}
): Promise<TPaginatedTechnologies> => {
  const {
    category,
    search,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    limit = 50,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const whereConditions = [];

  if (category) {
    whereConditions.push(eq(technologies.category, category));
  }

  if (search && search.trim()) {
    whereConditions.push(
      sql`${technologies.name} ILIKE ${`%${search.trim()}%`}`
    );
  }

  const where =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const sortColumn =
    sortBy === "category" ? technologies.category : technologies.name;
  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(technologies)
      .where(where),
    db.query.technologies.findMany({
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
// READ — BY ID
// ==========================================
export const getTechnologyByIdService = async (
  id: string
): Promise<TSelectTech | null> => {
  const tech = await db.query.technologies.findFirst({
    where: eq(technologies.id, id),
  });
  return tech ?? null;
};

// ==========================================
// READ — BY NAME
// ==========================================
export const getTechnologyByNameService = async (
  name: string
): Promise<TSelectTech | null> => {
  const tech = await db.query.technologies.findFirst({
    where: sql`LOWER(${technologies.name}) = LOWER(${name.trim()})`,
  });
  return tech ?? null;
};

// ==========================================
// READ — BULK
// ==========================================
export const getTechnologiesByIdsService = async (
  ids: string[]
): Promise<TSelectTech[]> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  return db
    .select()
    .from(technologies)
    .where(inArray(technologies.id, uniqueIds));
};

// ==========================================
// READ — BY CATEGORY (grouped)
// ==========================================
export const getTechnologiesByCategoryService = async (): Promise<
  Record<TTechCategory, TSelectTech[]>
> => {
  const all = await db.query.technologies.findMany({
    orderBy: [asc(technologies.name)],
  });

  const grouped: Record<TTechCategory, TSelectTech[]> = {
    frontend: [],
    backend: [],
    database: [],
    devops: [],
    mobile: [],
    ai: [],
  };

  for (const tech of all) {
    grouped[tech.category].push(tech);
  }

  return grouped;
};

// ==========================================
// READ — USAGE (before delete)
// ==========================================
export const getTechnologyUsageService = async (
  id: string
): Promise<TTechnologyUsage> => {
  const [projectCount, serviceCount, skillRow] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(projectTechnologies)
      .where(eq(projectTechnologies.technologyId, id)),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(serviceTechnologies)
      .where(eq(serviceTechnologies.technologyId, id)),
    db.query.skills.findFirst({
      where: eq(skills.techId, id),
    }),
  ]);

  return {
    projects: projectCount[0]?.count ?? 0,
    services: serviceCount[0]?.count ?? 0,
    hasSkill: !!skillRow,
  };
};

// ==========================================
// CREATE
// ==========================================
export const createTechnologyService = async (
  input: TCreateTechnologyInput
): Promise<TSelectTech> => {
  assertNonEmpty(input.name, "Name");
  assertLength(input.name, 50, "Name");

  if (!VALID_CATEGORIES.includes(input.category)) {
    throw new Error(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  if (input.iconName) {
    assertLength(input.iconName, 50, "iconName");
  }

  // check name uniqueness (case-insensitive)
  const existing = await getTechnologyByNameService(input.name);
  if (existing) {
    throw new Error(`Technology "${input.name}" already exists`);
  }

  const [created] = await db
    .insert(technologies)
    .values({
      name: input.name.trim(),
      category: input.category,
      iconName: input.iconName?.trim() ?? null,
    })
    .returning();

  return created;
};

// ==========================================
// UPDATE
// ==========================================
export const updateTechnologyService = async (
  id: string,
  input: TUpdateTechnologyInput
): Promise<TSelectTech | null> => {
  const existing = await getTechnologyByIdService(id);
  if (!existing) return null;

  if (input.name !== undefined) {
    assertNonEmpty(input.name, "Name");
    assertLength(input.name, 50, "Name");

    // check name uniqueness (excluding self)
    const duplicate = await db.query.technologies.findFirst({
      where: and(
        sql`LOWER(${technologies.name}) = LOWER(${input.name.trim()})`,
        sql`${technologies.id} <> ${id}`
      ),
    });
    if (duplicate) {
      throw new Error(`Technology "${input.name}" already exists`);
    }
  }

  if (input.category && !VALID_CATEGORIES.includes(input.category)) {
    throw new Error(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  if (input.iconName !== undefined && input.iconName !== null) {
    assertLength(input.iconName, 50, "iconName");
  }

  const [updated] = await db
    .update(technologies)
    .set({
      name: input.name?.trim() ?? existing.name,
      category: input.category ?? existing.category,
      iconName:
        input.iconName !== undefined ? input.iconName : existing.iconName,
    })
    .where(eq(technologies.id, id))
    .returning();

  return updated ?? null;
};

// ==========================================
// DELETE
// ==========================================
// Because projectTechnologies, serviceTechnologies, and skills all have
// `onDelete: "cascade"` on technologyId, deleting a tech removes it from
// every project/service/skill. Safe to call.
export const deleteTechnologyService = async (id: string): Promise<boolean> => {
  const existing = await getTechnologyByIdService(id);
  if (!existing) return false;

  await db.delete(technologies).where(eq(technologies.id, id));
  return true;
};