// src/services/Project/project.service.ts
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import {
  projects,
  projectLinks,
  projectSections,
  projectTimeline,
  projectTechnologies,
  mediaAssets,
  TSelectProject,
  TSelectProjectLink,
  TSelectProjectSection,
  TSelectProjectTimeline,
  TSelectTech,
} from "../../drizzle/schema";
import db from "../../drizzle/db";

// ==========================================
// TYPES — INPUT / OUTPUT
// ==========================================
export type TProjectStatus = "draft" | "published" | "archived";
export type TLinkType =
  | "github_frontend"
  | "github_backend"
  | "github_fullstack"
  | "live_demo"
  | "documentation"
  | "design";

export type TProjectFilters = {
  status?: TProjectStatus;
  featured?: boolean;
  search?: string;
  techIds?: string[];
  includeDeleted?: boolean;
  sortBy?: "createdAt" | "updatedAt" | "viewCount" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedProjects = {
  data: TSelectProject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TProjectLinkInput = {
  label: string;
  url: string;
  type?: TLinkType;
};

export type TProjectSectionInput = {
  sectionTitle?: string | null;
  explanation?: string | null;
  mediaId?: string | null;
  order?: number;
};

export type TCreateProjectInput = {
  title: string;
  slug?: string;
  mainDescription: string;
  mainThumbnailId?: string | null;
  status?: TProjectStatus;
  isFeatured?: boolean;
  links?: TProjectLinkInput[];
  sections?: TProjectSectionInput[];
  techIds?: string[];
  timeline?: {
    title: string;
    description?: string | null;
    date?: Date;
  }[];
};

export type TUpdateProjectInput = Partial<TCreateProjectInput>;

export type TProjectWithRelations = TSelectProject & {
  thumbnail: typeof mediaAssets.$inferSelect | null;
  links: TSelectProjectLink[];
  sections: (TSelectProjectSection & {
    media: typeof mediaAssets.$inferSelect | null;
  })[];
  techs: {
    projectId: string;
    technologyId: string;
    role: string | null;
    yearsUsed: number | null;
    technology: TSelectTech;
  }[];
  timeline: TSelectProjectTimeline[];
};

// ==========================================
// VALIDATION HELPERS
// ==========================================
const MAX_LIMIT = 100;
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

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
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
    const existing = await db.query.projects.findFirst({
      where: and(
        eq(projects.slug, slug),
        excludeId ? sql`${projects.id} <> ${excludeId}` : sql`true`
      ),
    });
    if (!existing) return slug;
    slug = `${base}-${n++}`;
  }

  return `${base}-${Date.now()}`;
};

// ==========================================
// INTERNAL — fetch full project by id (with children)
// ==========================================
const fetchProjectFullById = async (
  id: string,
  executor: typeof db = db
): Promise<TProjectWithRelations | null> => {
  const project = await executor.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      thumbnail: true,
      links: true,
      sections: {
        with: { media: true },
        orderBy: (s, { asc }) => [asc(s.order)],
      },
      techs: { with: { technology: true } },
      timeline: { orderBy: (t, { asc }) => [asc(t.date)] },
    },
  });

  return (project as TProjectWithRelations) ?? null;
};

// ==========================================
// READ — LIST (paginated, filtered, with relations)
// ==========================================
export const listProjectsService = async (
  filters: TProjectFilters = {}
): Promise<TPaginatedProjects> => {
  const {
    status,
    featured,
    search,
    techIds,
    includeDeleted = false,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const whereConditions = [];

  if (!includeDeleted) {
    whereConditions.push(isNull(projects.deletedAt));
  }

  if (status) {
    whereConditions.push(eq(projects.status, status));
  }

  if (featured !== undefined) {
    whereConditions.push(eq(projects.isFeatured, featured));
  }

  if (search && search.trim()) {
    whereConditions.push(
      sql`(${projects.title} ILIKE ${`%${search.trim()}%`} OR ${projects.mainDescription} ILIKE ${`%${search.trim()}%`})`
    );
  }

  if (techIds && techIds.length > 0) {
    whereConditions.push(
      sql`${projects.id} IN (
        SELECT ${projectTechnologies.projectId}
        FROM ${projectTechnologies}
        WHERE ${projectTechnologies.technologyId} IN (${sql.join(
          techIds.map((id) => sql`${id}`),
          sql`, `
        )})
      )`
    );
  }

  const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const sortColumn =
    sortBy === "title"
      ? projects.title
      : sortBy === "viewCount"
        ? projects.viewCount
        : sortBy === "updatedAt"
          ? projects.updatedAt
          : projects.createdAt;

  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(projects)
      .where(where),
    // ✅ ONLY CHANGE: added the `with` block so the list returns relations
    db.query.projects.findMany({
      where,
      orderBy: [sql`${sortColumn} ${orderDirection}`],
      limit: safeLimit,
      offset,
      with: {
        thumbnail: true,
        links: true,
        sections: {
          with: { media: true },
          orderBy: (s, { asc }) => [asc(s.order)],
        },
        techs: { with: { technology: true } },
        timeline: { orderBy: (t, { asc }) => [asc(t.date)] },
      },
    }),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: data as TSelectProject[],
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
// READ — SINGLE BY SLUG (increments view count)
// ==========================================
export const getProjectBySlugService = async (
  slug: string
): Promise<TProjectWithRelations | null> => {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.slug, slug), isNull(projects.deletedAt)),
    with: {
      thumbnail: true,
      links: true,
      sections: {
        with: { media: true },
        orderBy: (s, { asc }) => [asc(s.order)],
      },
      techs: { with: { technology: true } },
      timeline: { orderBy: (t, { asc }) => [asc(t.date)] },
    },
  });

  if (!project) return null;

  void db
    .update(projects)
    .set({ viewCount: sql`${projects.viewCount} + 1` })
    .where(eq(projects.id, project.id))
    .catch((err) => {
      console.error("Failed to increment view count:", err);
    });

  return project as TProjectWithRelations;
};

// ==========================================
// READ — SINGLE BY ID (no view increment)
// ==========================================
export const getProjectByIdService = async (
  id: string
): Promise<TProjectWithRelations | null> => {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), isNull(projects.deletedAt)),
    with: {
      thumbnail: true,
      links: true,
      sections: {
        with: { media: true },
        orderBy: (s, { asc }) => [asc(s.order)],
      },
      techs: { with: { technology: true } },
      timeline: { orderBy: (t, { asc }) => [asc(t.date)] },
    },
  });

  return (project as TProjectWithRelations) ?? null;
};

// ==========================================
// READ — STATS
// ==========================================
export const getProjectStatsService = async () => {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      published: sql<number>`COUNT(*) FILTER (WHERE ${projects.status} = 'published')::int`,
      drafts: sql<number>`COUNT(*) FILTER (WHERE ${projects.status} = 'draft')::int`,
      archived: sql<number>`COUNT(*) FILTER (WHERE ${projects.status} = 'archived')::int`,
      featured: sql<number>`COUNT(*) FILTER (WHERE ${projects.isFeatured} = true)::int`,
      totalViews: sql<number>`COALESCE(SUM(${projects.viewCount}), 0)::int`,
    })
    .from(projects)
    .where(isNull(projects.deletedAt));

  return row;
};

// ==========================================
// CREATE — returns full project with children
// ==========================================
export const createProjectService = async (
  input: TCreateProjectInput
): Promise<TProjectWithRelations> => {
  assertNonEmpty(input.title, "Title");
  assertLength(input.title, 255, "Title");
  assertNonEmpty(input.mainDescription, "Main description");

  if (input.slug) {
    assertLength(input.slug, 255, "Slug");
  }

  if (input.links) {
    for (const link of input.links) {
      assertNonEmpty(link.label, "Link label");
      assertNonEmpty(link.url, "Link URL");
      if (!isValidUrl(link.url)) {
        throw new Error(`Invalid URL: ${link.url}`);
      }
    }
  }

  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title);
  const slug = await ensureUniqueSlug(baseSlug);

  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projects)
      .values({
        title: input.title.trim(),
        slug,
        mainDescription: input.mainDescription.trim(),
        mainThumbnailId: input.mainThumbnailId ?? null,
        status: input.status ?? "published",
        isFeatured: input.isFeatured ?? false,
      })
      .returning();

    if (input.links?.length) {
      await tx.insert(projectLinks).values(
        input.links.map((l) => ({
          projectId: created.id,
          label: l.label.trim(),
          url: l.url.trim(),
          type: l.type ?? "github_fullstack",
        }))
      );
    }

    if (input.sections?.length) {
      await tx.insert(projectSections).values(
        input.sections.map((s, i) => ({
          projectId: created.id,
          sectionTitle: s.sectionTitle?.trim() ?? null,
          explanation: s.explanation?.trim() ?? null,
          mediaId: s.mediaId ?? null,
          order: s.order ?? i,
        }))
      );
    }

    if (input.techIds?.length) {
      await tx.insert(projectTechnologies).values(
        Array.from(new Set(input.techIds)).map((tid) => ({
          projectId: created.id,
          technologyId: tid,
        }))
      );
    }

    if (input.timeline?.length) {
      await tx.insert(projectTimeline).values(
        input.timeline.map((t) => ({
          projectId: created.id,
          title: t.title.trim(),
          description: t.description?.trim() ?? null,
          date: t.date ?? new Date(),
        }))
      );
    }

    // return the full project (with children)
    const full = await fetchProjectFullById(created.id, tx as unknown as typeof db);
    return full!;
  });
};

// ==========================================
// UPDATE — returns full project with children
// ==========================================
export const updateProjectService = async (
  id: string,
  input: TUpdateProjectInput
): Promise<TProjectWithRelations | null> => {
  const existing = await getProjectByIdService(id);
  if (!existing) return null;

  if (input.title !== undefined) {
    assertNonEmpty(input.title, "Title");
    assertLength(input.title, 255, "Title");
  }
  if (input.mainDescription !== undefined) {
    assertNonEmpty(input.mainDescription, "Main description");
  }

  if (input.links) {
    for (const link of input.links) {
      assertNonEmpty(link.label, "Link label");
      assertNonEmpty(link.url, "Link URL");
      if (!isValidUrl(link.url)) {
        throw new Error(`Invalid URL: ${link.url}`);
      }
    }
  }

  let slug = existing.slug;
  if (input.title !== undefined || input.slug !== undefined) {
    const base = input.slug ? slugify(input.slug) : slugify(input.title!);
    slug = await ensureUniqueSlug(base, id);
  }

  return await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        title: input.title?.trim() ?? existing.title,
        slug,
        mainDescription: input.mainDescription?.trim() ?? existing.mainDescription,
        mainThumbnailId:
          input.mainThumbnailId !== undefined
            ? input.mainThumbnailId
            : existing.mainThumbnailId,
        status: input.status ?? existing.status,
        isFeatured: input.isFeatured ?? existing.isFeatured,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    if (input.links) {
      await tx.delete(projectLinks).where(eq(projectLinks.projectId, id));
      if (input.links.length) {
        await tx.insert(projectLinks).values(
          input.links.map((l) => ({
            projectId: id,
            label: l.label.trim(),
            url: l.url.trim(),
            type: l.type ?? "github_fullstack",
          }))
        );
      }
    }

    if (input.sections) {
      await tx.delete(projectSections).where(eq(projectSections.projectId, id));
      if (input.sections.length) {
        await tx.insert(projectSections).values(
          input.sections.map((s, i) => ({
            projectId: id,
            sectionTitle: s.sectionTitle?.trim() ?? null,
            explanation: s.explanation?.trim() ?? null,
            mediaId: s.mediaId ?? null,
            order: s.order ?? i,
          }))
        );
      }
    }

    if (input.techIds) {
      await tx
        .delete(projectTechnologies)
        .where(eq(projectTechnologies.projectId, id));
      if (input.techIds.length) {
        await tx.insert(projectTechnologies).values(
          Array.from(new Set(input.techIds)).map((tid) => ({
            projectId: id,
            technologyId: tid,
          }))
        );
      }
    }

    if (input.timeline) {
      await tx.delete(projectTimeline).where(eq(projectTimeline.projectId, id));
      if (input.timeline.length) {
        await tx.insert(projectTimeline).values(
          input.timeline.map((t) => ({
            projectId: id,
            title: t.title.trim(),
            description: t.description?.trim() ?? null,
            date: t.date ?? new Date(),
          }))
        );
      }
    }

    const full = await fetchProjectFullById(id, tx as unknown as typeof db);
    return full!;
  });
};

// ==========================================
// DELETE — SOFT
// ==========================================
export const deleteProjectService = async (id: string): Promise<boolean> => {
  const [deleted] = await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .returning();

  return !!deleted;
};

// ==========================================
// DELETE — HARD (permanent, admin only)
// ==========================================
export const hardDeleteProjectService = async (
  id: string
): Promise<boolean> => {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning();

  return !!deleted;
};

// ==========================================
// RESTORE — UNDO SOFT DELETE
// ==========================================
export const restoreProjectService = async (id: string): Promise<boolean> => {
  const [restored] = await db
    .update(projects)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return !!restored;
};

// ==========================================
// TOGGLE FEATURED
// ==========================================
export const toggleFeaturedService = async (
  id: string
): Promise<TSelectProject | null> => {
  const [row] = await db
    .update(projects)
    .set({
      isFeatured: sql`NOT ${projects.isFeatured}`,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .returning();

  return row ?? null;
};

// ==========================================
// UPDATE STATUS (draft / published / archived)
// ==========================================
export const updateProjectStatusService = async (
  id: string,
  status: TProjectStatus
): Promise<TSelectProject | null> => {
  const [row] = await db
    .update(projects)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .returning();

  return row ?? null;
};