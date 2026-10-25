// src/services/Post/post.service.ts
import { and, desc, eq, isNull, sql, inArray } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  posts,
  postRevisions,
  postTags,
  tags,
  postReactions,
  postRatings,
  mediaAssets,
  users,
  TSelectPost,
  TSelectTag,
  TSelectPostReaction,
  TSelectPostRating,
  TSelectPostRevision,
  TSelectMedia,
  TSelectUser,
} from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TPostFilters = {
  status?: "draft" | "published";
  featured?: boolean;
  tagSlug?: string;
  search?: string;
  includeDeleted?: boolean;
  sortBy?: "createdAt" | "updatedAt" | "viewCount" | "publishedAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedPosts = {
  data: TSelectPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TCreatePostInput = {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  coverImageId?: string | null;
  readingTime?: number | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  publishedAt?: Date | null;
  tagSlugs?: string[]; // e.g. ["react", "typescript"]
};

export type TUpdatePostInput = Partial<TCreatePostInput>;

export type TPostWithRelations = TSelectPost & {
  coverImage: TSelectMedia | null;
  author: TSelectUser | null;
  tags: TSelectTag[];
  reactionsCount: number;
  ratingsAvg: number;
  ratingsCount: number;
};

export type TPostDetail = TPostWithRelations & {
  reactions: TSelectPostReaction[];
  ratings: TSelectPostRating[];
};

export type TCreatePostReactionInput = {
  reaction: string;
};

export type TCreatePostRatingInput = {
  visitorId: string;
  rating: number;
};

export type TPostStats = {
  total: number;
  published: number;
  drafts: number;
  featured: number;
  totalViews: number;
  totalReactions: number;
  totalRatings: number;
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const VALID_REACTIONS = ["like", "love", "fire", "clap", "mind_blown"];
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
    const existing = await db.query.posts.findFirst({
      where: and(
        eq(posts.slug, slug),
        excludeId ? sql`${posts.id} <> ${excludeId}` : sql`true`
      ),
    });
    if (!existing) return slug;
    slug = `${base}-${n++}`;
  }

  return `${base}-${Date.now()}`;
};

// ==========================================
// INTERNAL — fetch post with relations
// ==========================================
const fetchPostFullById = async (
  id: string,
  executor: typeof db = db
): Promise<TPostDetail | null> => {
  const post = await executor.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      coverImage: true,
      author: true,
      tags: { with: { tag: true } },
      reactions: true,
      ratings: true,
    },
  });

  if (!post) return null;

  // shape it to our type
  const reactionsCount = post.reactions?.length ?? 0;
  const ratingsCount = post.ratings?.length ?? 0;
  const ratingsAvg =
    ratingsCount > 0
      ? post.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount
      : 0;

  return {
    ...post,
    tags: (post.tags ?? []).map((pt) => pt.tag).filter(Boolean) as TSelectTag[],
    reactionsCount,
    ratingsAvg: Math.round(ratingsAvg * 10) / 10,
    ratingsCount,
  } as TPostDetail;
};

// ==========================================
// READ — LIST
// ==========================================
export const listPostsService = async (
  filters: TPostFilters = {}
): Promise<TPaginatedPosts> => {
  const {
    status,
    featured,
    tagSlug,
    search,
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
    whereConditions.push(isNull(posts.deletedAt));
  }

  if (status) {
    whereConditions.push(eq(posts.isPublished, status === "published"));
  }

  if (featured !== undefined) {
    whereConditions.push(eq(posts.isFeatured, featured));
  }

  if (search && search.trim()) {
    whereConditions.push(
      sql`(${posts.title} ILIKE ${`%${search.trim()}%`} OR ${posts.excerpt} ILIKE ${`%${search.trim()}%`} OR ${posts.content} ILIKE ${`%${search.trim()}%`})`
    );
  }

  if (tagSlug && tagSlug.trim()) {
    whereConditions.push(
      sql`${posts.id} IN (
        SELECT ${postTags.postId}
        FROM ${postTags}
        JOIN ${tags} ON ${tags.id} = ${postTags.tagId}
        WHERE ${tags.slug} = ${tagSlug.trim()}
      )`
    );
  }

  const where =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const sortColumn =
    sortBy === "updatedAt"
      ? posts.updatedAt
      : sortBy === "viewCount"
        ? posts.viewCount
        : sortBy === "publishedAt"
          ? posts.publishedAt
          : posts.createdAt;

  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(posts)
      .where(where),
    db.query.posts.findMany({
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
// READ — BY SLUG (increments view)
// ==========================================
export const getPostBySlugService = async (
  slug: string
): Promise<TPostDetail | null> => {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.slug, slug), isNull(posts.deletedAt)),
    with: {
      coverImage: true,
      author: true,
      tags: { with: { tag: true } },
      reactions: true,
      ratings: true,
    },
  });

  if (!post) return null;

  // fire-and-forget increment
  void db
    .update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, post.id))
    .catch((err) => console.error("Failed to increment view count:", err));

  const reactionsCount = post.reactions?.length ?? 0;
  const ratingsCount = post.ratings?.length ?? 0;
  const ratingsAvg =
    ratingsCount > 0
      ? post.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount
      : 0;

  return {
    ...post,
    tags: (post.tags ?? []).map((pt) => pt.tag).filter(Boolean) as TSelectTag[],
    reactionsCount,
    ratingsAvg: Math.round(ratingsAvg * 10) / 10,
    ratingsCount,
  } as TPostDetail;
};

// ==========================================
// READ — BY ID
// ==========================================
export const getPostByIdService = async (
  id: string
): Promise<TPostDetail | null> => {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
    with: {
      coverImage: true,
      author: true,
      tags: { with: { tag: true } },
      reactions: true,
      ratings: true,
    },
  });

  if (!post) return null;

  const reactionsCount = post.reactions?.length ?? 0;
  const ratingsCount = post.ratings?.length ?? 0;
  const ratingsAvg =
    ratingsCount > 0
      ? post.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount
      : 0;

  return {
    ...post,
    tags: (post.tags ?? []).map((pt) => pt.tag).filter(Boolean) as TSelectTag[],
    reactionsCount,
    ratingsAvg: Math.round(ratingsAvg * 10) / 10,
    ratingsCount,
  } as TPostDetail;
};

// ==========================================
// STATS
// ==========================================
export const getPostStatsService = async (): Promise<TPostStats> => {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      published: sql<number>`COUNT(*) FILTER (WHERE ${posts.isPublished} = true)::int`,
      drafts: sql<number>`COUNT(*) FILTER (WHERE ${posts.isPublished} = false)::int`,
      featured: sql<number>`COUNT(*) FILTER (WHERE ${posts.isFeatured} = true)::int`,
      totalViews: sql<number>`COALESCE(SUM(${posts.viewCount}), 0)::int`,
      totalReactions: sql<number>`(SELECT COUNT(*)::int FROM ${postReactions})`,
      totalRatings: sql<number>`(SELECT COUNT(*)::int FROM ${postRatings})`,
    })
    .from(posts)
    .where(isNull(posts.deletedAt));

  return row;
};

// ==========================================
// TAGS — helper to resolve tag slugs → ids (auto-create tags)
// ==========================================
const resolveTagIds = async (
  tagSlugs: string[],
  tx: typeof db
): Promise<string[]> => {
  const cleanSlugs = Array.from(
    new Set(
      tagSlugs
        .map((s) => slugify(s))
        .filter((s) => s.length > 0)
    )
  );

  if (cleanSlugs.length === 0) return [];

  // find existing
  const existing = await tx
    .select()
    .from(tags)
    .where(inArray(tags.slug, cleanSlugs));

  const existingSlugs = new Set(existing.map((t) => t.slug));
  const toCreate = cleanSlugs.filter((s) => !existingSlugs.has(s));

  let created: TSelectTag[] = [];
  if (toCreate.length > 0) {
    created = await tx
      .insert(tags)
      .values(
        toCreate.map((slug) => ({
          name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          slug,
        }))
      )
      .returning();
  }

  return [...existing, ...created].map((t) => t.id);
};

// ==========================================
// CREATE
// ==========================================
export const createPostService = async (
  input: TCreatePostInput,
  authorId?: string | null
): Promise<TPostDetail> => {
  assertNonEmpty(input.title, "Title");
  assertLength(input.title, 255, "Title");
  assertNonEmpty(input.content, "Content");

  if (input.slug) assertLength(input.slug, 255, "Slug");

  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title);
  const slug = await ensureUniqueSlug(baseSlug);

  return await db.transaction(async (tx) => {
    const isPublished = input.isPublished ?? false;
    const publishedAt =
      input.publishedAt ?? (isPublished ? new Date() : null);

    const [created] = await tx
      .insert(posts)
      .values({
        title: input.title.trim(),
        slug,
        excerpt: input.excerpt?.trim() || null,
        content: input.content.trim(),
        coverImageId: input.coverImageId ?? null,
        authorId: authorId ?? null,
        readingTime: input.readingTime ?? null,
        isFeatured: input.isFeatured ?? false,
        isPublished,
        publishedAt,
      })
      .returning();

    // create first revision
    await tx.insert(postRevisions).values({
      postId: created.id,
      title: created.title,
      content: created.content,
      editedBy: authorId ?? null,
    });

    // attach tags
    if (input.tagSlugs && input.tagSlugs.length > 0) {
      const tagIds = await resolveTagIds(
        input.tagSlugs,
        tx as unknown as typeof db
      );
      if (tagIds.length > 0) {
        await tx.insert(postTags).values(
          tagIds.map((tagId) => ({ postId: created.id, tagId }))
        );
      }
    }

    const full = await fetchPostFullById(created.id, tx as unknown as typeof db);
    return full!;
  });
};

// ==========================================
// UPDATE (creates a revision each time content/title changes)
// ==========================================
export const updatePostService = async (
  id: string,
  input: TUpdatePostInput,
  editorId?: string | null
): Promise<TPostDetail | null> => {
  const existing = await getPostByIdService(id);
  if (!existing) return null;

  if (input.title !== undefined) {
    assertNonEmpty(input.title, "Title");
    assertLength(input.title, 255, "Title");
  }
  if (input.content !== undefined) {
    assertNonEmpty(input.content, "Content");
  }

  let slug = existing.slug;
  if (input.title !== undefined || input.slug !== undefined) {
    const base = input.slug ? slugify(input.slug) : slugify(input.title!);
    slug = await ensureUniqueSlug(base, id);
  }

  return await db.transaction(async (tx) => {
    const willBePublished = input.isPublished ?? existing.isPublished;
    const publishedAt =
      input.publishedAt !== undefined
        ? input.publishedAt
        : willBePublished && !existing.publishedAt
          ? new Date()
          : existing.publishedAt;

    const [updated] = await tx
      .update(posts)
      .set({
        title: input.title?.trim() ?? existing.title,
        slug,
        excerpt:
          input.excerpt !== undefined
            ? input.excerpt?.trim() || null
            : existing.excerpt,
        content: input.content?.trim() ?? existing.content,
        coverImageId:
          input.coverImageId !== undefined
            ? input.coverImageId
            : existing.coverImageId,
        readingTime:
          input.readingTime !== undefined
            ? input.readingTime
            : existing.readingTime,
        isFeatured:
          input.isFeatured !== undefined
            ? input.isFeatured
            : existing.isFeatured,
        isPublished: willBePublished,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();

    // create a new revision if title or content changed
    if (input.title !== undefined || input.content !== undefined) {
      await tx.insert(postRevisions).values({
        postId: id,
        title: updated.title,
        content: updated.content,
        editedBy: editorId ?? null,
      });
    }

    // replace tags if provided
    if (input.tagSlugs) {
      await tx.delete(postTags).where(eq(postTags.postId, id));
      const tagIds = await resolveTagIds(
        input.tagSlugs,
        tx as unknown as typeof db
      );
      if (tagIds.length > 0) {
        await tx.insert(postTags).values(
          tagIds.map((tagId) => ({ postId: id, tagId }))
        );
      }
    }

    const full = await fetchPostFullById(id, tx as unknown as typeof db);
    return full!;
  });
};

// ==========================================
// DELETE — SOFT
// ==========================================
export const deletePostService = async (id: string): Promise<boolean> => {
  const [deleted] = await db
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .returning();

  return !!deleted;
};

// ==========================================
// RESTORE
// ==========================================
export const restorePostService = async (id: string): Promise<boolean> => {
  const [restored] = await db
    .update(posts)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning();

  return !!restored;
};

// ==========================================
// HARD DELETE
// ==========================================
export const hardDeletePostService = async (id: string): Promise<boolean> => {
  const [deleted] = await db
    .delete(posts)
    .where(eq(posts.id, id))
    .returning();

  return !!deleted;
};

// ==========================================
// TOGGLE PUBLISH
// ==========================================
export const togglePublishService = async (
  id: string
): Promise<TSelectPost | null> => {
  const existing = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  });
  if (!existing) return null;

  const willPublish = !existing.isPublished;

  const [row] = await db
    .update(posts)
    .set({
      isPublished: willPublish,
      publishedAt: willPublish ? existing.publishedAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();

  return row ?? null;
};

// ==========================================
// TOGGLE FEATURED
// ==========================================
export const toggleFeaturedPostService = async (
  id: string
): Promise<TSelectPost | null> => {
  const [row] = await db
    .update(posts)
    .set({
      isFeatured: sql`NOT ${posts.isFeatured}`,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .returning();

  return row ?? null;
};

// ==========================================
// REVISIONS — list
// ==========================================
export const listRevisionsService = async (
  postId: string
): Promise<TSelectPostRevision[]> => {
  return db.query.postRevisions.findMany({
    where: eq(postRevisions.postId, postId),
    orderBy: [desc(postRevisions.createdAt)],
  });
};

// ==========================================
// REACTIONS — add
// ==========================================
export const addReactionService = async (
  postId: string,
  input: TCreatePostReactionInput
): Promise<TSelectPostReaction> => {
  const reaction = input.reaction?.trim().toLowerCase();

  if (!reaction || !VALID_REACTIONS.includes(reaction)) {
    throw new Error(`reaction must be one of: ${VALID_REACTIONS.join(", ")}`);
  }

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
  });
  if (!post) throw new Error("Post not found");

  const [created] = await db
    .insert(postReactions)
    .values({ postId, reaction })
    .returning();

  return created;
};

// ==========================================
// REACTIONS — aggregate counts for a post
// ==========================================
export const getReactionCountsService = async (
  postId: string
): Promise<Record<string, number>> => {
  const rows = await db
    .select({
      reaction: postReactions.reaction,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postReactions)
    .where(eq(postReactions.postId, postId))
    .groupBy(postReactions.reaction);

  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.reaction] = r.count;
    return acc;
  }, {});
};

// ==========================================
// RATINGS — add/update (unique per visitor)
// ==========================================
export const ratePostService = async (
  postId: string,
  input: TCreatePostRatingInput
): Promise<TSelectPostRating> => {
  const rating = input.rating;
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    throw new Error(`rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`);
  }

  const visitorId = input.visitorId?.trim();
  if (!visitorId) throw new Error("visitorId is required");
  if (visitorId.length > 100) throw new Error("visitorId is too long");

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
  });
  if (!post) throw new Error("Post not found");

  // upsert: same visitor + same post → update rating
  const existing = await db.query.postRatings.findFirst({
    where: and(
      eq(postRatings.postId, postId),
      eq(postRatings.visitorId, visitorId)
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(postRatings)
      .set({ rating })
      .where(eq(postRatings.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(postRatings)
    .values({ postId, visitorId, rating })
    .returning();

  return created;
};

// ==========================================
// RATINGS — aggregate
// ==========================================
export const getRatingsSummaryService = async (
  postId: string
): Promise<{ avg: number; count: number; distribution: Record<number, number> }> => {
  const rows = await db
    .select({
      rating: postRatings.rating,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postRatings)
    .where(eq(postRatings.postId, postId))
    .groupBy(postRatings.rating);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;

  for (const row of rows) {
    distribution[row.rating] = row.count;
    total += row.count;
    sum += row.rating * row.count;
  }

  return {
    avg: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    count: total,
    distribution,
  };
};