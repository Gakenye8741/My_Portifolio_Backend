// src/services/Skill/skill.service.ts
import { and, eq, sql, inArray } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  skills,
  technologies,
  TSelectSkill,
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

export type TSkillFilters = {
  category?: TTechCategory;
  minProficiency?: number;
  search?: string;
  sortBy?: "proficiency" | "yearsExperience" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedSkills = {
  data: TSkillWithTech[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TCreateSkillInput = {
  techId: string;
  proficiency?: number | null;
  yearsExperience?: number | null;
};

export type TUpdateSkillInput = {
  proficiency?: number | null;
  yearsExperience?: number | null;
};

export type TSkillWithTech = TSelectSkill & {
  technology: TSelectTech | null;
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const MIN_PROFICIENCY = 0;
const MAX_PROFICIENCY = 100;

// ==========================================
// VALIDATION
// ==========================================
const validateProficiency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return;
  if (
    !Number.isInteger(value) ||
    value < MIN_PROFICIENCY ||
    value > MAX_PROFICIENCY
  ) {
    throw new Error(
      `proficiency must be an integer between ${MIN_PROFICIENCY} and ${MAX_PROFICIENCY}`
    );
  }
};

const validateYears = (value: number | undefined | null) => {
  if (value === undefined || value === null) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("yearsExperience must be a non-negative integer");
  }
};

// ==========================================
// INTERNAL — shape raw row to TSkillWithTech
// ==========================================
type TRawSkillRow = TSelectSkill & {
  technology: TSelectTech | null;
};

const shapeSkill = (row: TRawSkillRow): TSkillWithTech => ({
  ...row,
  technology: row.technology ?? null,
});

// ==========================================
// INTERNAL — fetch skill with tech (via relation)
// ==========================================
const fetchSkillFullById = async (
  id: string
): Promise<TSkillWithTech | null> => {
  const skill = await db.query.skills.findFirst({
    where: eq(skills.id, id),
    with: { technology: true },
  });

  if (!skill) return null;
  return shapeSkill(skill as TRawSkillRow);
};

// ==========================================
// READ — LIST (relation query + pre-resolved tech filter)
// ==========================================
export const listSkillsService = async (
  filters: TSkillFilters = {}
): Promise<TPaginatedSkills> => {
  const {
    category,
    minProficiency,
    search,
    sortBy = "proficiency",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  // For tech filters, pre-resolve matching tech IDs so we can filter on skills.techId
  // This keeps the main query as a pure relation query (no joins).
  let techIdFilter: string[] | null = null;

  if (category || (search && search.trim())) {
    const techWhereConditions = [];

    if (category) {
      techWhereConditions.push(eq(technologies.category, category));
    }
    if (search && search.trim()) {
      techWhereConditions.push(
        sql`${technologies.name} ILIKE ${`%${search.trim()}%`}`
      );
    }

    const matchingTechs = await db
      .select({ id: technologies.id })
      .from(technologies)
      .where(
        techWhereConditions.length > 0
          ? and(...techWhereConditions)
          : undefined
      );

    techIdFilter = matchingTechs.map((t) => t.id);

    // if user asked for a category/search but no techs match → return empty early
    if (techIdFilter.length === 0) {
      return {
        data: [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  // build where conditions on skills table only
  const whereConditions = [];

  if (techIdFilter) {
    // ✅ FIXED: use inArray instead of = ANY(...)
    whereConditions.push(inArray(skills.techId, techIdFilter));
  }

  if (minProficiency !== undefined) {
    whereConditions.push(sql`${skills.proficiency} >= ${minProficiency}`);
  }

  const where =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // sort column (skills-only or tech-name via relation)
  // For "name" sort we need to sort by tech name — do it in JS after fetch
  const isSortByName = sortBy === "name";

  const sortColumn = isSortByName
    ? skills.id // placeholder; resort in JS
    : sortBy === "yearsExperience"
      ? skills.yearsExperience
      : skills.proficiency;

  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  // count + data in parallel (pure relation queries)
  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(skills)
      .where(where),
    db.query.skills.findMany({
      where,
      with: { technology: true },
      orderBy: isSortByName
        ? undefined
        : [sql`${sortColumn} ${orderDirection}`],
      limit: safeLimit,
      offset,
    }),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / safeLimit);

  const data = rows.map((r) => shapeSkill(r as TRawSkillRow));

  // in-memory sort for tech name
  if (isSortByName) {
    data.sort((a, b) => {
      const an = a.technology?.name ?? "";
      const bn = b.technology?.name ?? "";
      const cmp = an.localeCompare(bn);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }

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
// READ — GROUPED BY CATEGORY (relation query)
// ==========================================
export const getSkillsGroupedService = async (): Promise<
  Record<TTechCategory, TSkillWithTech[]>
> => {
  const rows = await db.query.skills.findMany({
    with: { technology: true },
    orderBy: [sql`${skills.proficiency} DESC`],
  });

  const grouped: Record<TTechCategory, TSkillWithTech[]> = {
    frontend: [],
    backend: [],
    database: [],
    devops: [],
    mobile: [],
    ai: [],
  };

  for (const row of rows) {
    const shaped = shapeSkill(row as TRawSkillRow);
    if (shaped.technology) {
      grouped[shaped.technology.category].push(shaped);
    }
  }

  return grouped;
};

// ==========================================
// READ — BY ID
// ==========================================
export const getSkillByIdService = async (
  id: string
): Promise<TSkillWithTech | null> => {
  return fetchSkillFullById(id);
};

// ==========================================
// READ — BY TECH ID
// ==========================================
export const getSkillByTechIdService = async (
  techId: string
): Promise<TSkillWithTech | null> => {
  const skill = await db.query.skills.findFirst({
    where: eq(skills.techId, techId),
    with: { technology: true },
  });

  if (!skill) return null;
  return shapeSkill(skill as TRawSkillRow);
};

// ==========================================
// CREATE
// ==========================================
export const createSkillService = async (
  input: TCreateSkillInput
): Promise<TSkillWithTech> => {
  if (!input.techId || !input.techId.trim()) {
    throw new Error("techId is required");
  }

  validateProficiency(input.proficiency);
  validateYears(input.yearsExperience);

  // verify tech exists
  const tech = await db.query.technologies.findFirst({
    where: eq(technologies.id, input.techId),
  });
  if (!tech) {
    throw new Error("Technology not found");
  }

  // verify tech doesn't already have a skill (unique constraint)
  const existing = await db.query.skills.findFirst({
    where: eq(skills.techId, input.techId),
  });
  if (existing) {
    throw new Error(
      `A skill already exists for "${tech.name}". Update it instead.`
    );
  }

  const [created] = await db
    .insert(skills)
    .values({
      techId: input.techId,
      proficiency: input.proficiency ?? null,
      yearsExperience: input.yearsExperience ?? null,
    })
    .returning();

  const full = await fetchSkillFullById(created.id);
  return full!;
};

// ==========================================
// UPDATE
// ==========================================
export const updateSkillService = async (
  id: string,
  input: TUpdateSkillInput
): Promise<TSkillWithTech | null> => {
  const existing = await fetchSkillFullById(id);
  if (!existing) return null;

  validateProficiency(input.proficiency);
  validateYears(input.yearsExperience);

  await db
    .update(skills)
    .set({
      proficiency:
        input.proficiency !== undefined
          ? input.proficiency
          : existing.proficiency,
      yearsExperience:
        input.yearsExperience !== undefined
          ? input.yearsExperience
          : existing.yearsExperience,
    })
    .where(eq(skills.id, id));

  return fetchSkillFullById(id);
};

// ==========================================
// UPSERT BY TECH
// ==========================================
export const upsertSkillByTechService = async (
  techId: string,
  input: Omit<TCreateSkillInput, "techId">
): Promise<TSkillWithTech> => {
  validateProficiency(input.proficiency);
  validateYears(input.yearsExperience);

  const tech = await db.query.technologies.findFirst({
    where: eq(technologies.id, techId),
  });
  if (!tech) throw new Error("Technology not found");

  const existing = await db.query.skills.findFirst({
    where: eq(skills.techId, techId),
  });

  if (existing) {
    await db
      .update(skills)
      .set({
        proficiency:
          input.proficiency !== undefined
            ? input.proficiency
            : existing.proficiency,
        yearsExperience:
          input.yearsExperience !== undefined
            ? input.yearsExperience
            : existing.yearsExperience,
      })
      .where(eq(skills.id, existing.id));

    const full = await fetchSkillFullById(existing.id);
    return full!;
  }

  const [created] = await db
    .insert(skills)
    .values({
      techId,
      proficiency: input.proficiency ?? null,
      yearsExperience: input.yearsExperience ?? null,
    })
    .returning();

  const full = await fetchSkillFullById(created.id);
  return full!;
};

// ==========================================
// DELETE
// ==========================================
export const deleteSkillService = async (id: string): Promise<boolean> => {
  const existing = await fetchSkillFullById(id);
  if (!existing) return false;

  await db.delete(skills).where(eq(skills.id, id));
  return true;
};