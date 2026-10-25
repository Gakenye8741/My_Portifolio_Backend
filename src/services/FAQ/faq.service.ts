// src/services/FAQ/faq.service.ts
import { asc, eq, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import { faqs, TSelectFaq } from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TFaqFilters = {
  search?: string;
  page?: number;
  limit?: number;
};

export type TPaginatedFaqs = {
  data: TSelectFaq[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TCreateFaqInput = {
  question: string;
  answer: string;
  order?: number;
};

export type TUpdateFaqInput = Partial<TCreateFaqInput>;

export type TReorderFaqInput = {
  id: string;
  order: number;
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

// ==========================================
// READ — LIST (ordered)
// ==========================================
export const listFaqsService = async (
  filters: TFaqFilters = {}
): Promise<TPaginatedFaqs> => {
  const { search, page = 1, limit = 50 } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const where = search?.trim()
    ? sql`(${faqs.question} ILIKE ${`%${search.trim()}%`} OR ${faqs.answer} ILIKE ${`%${search.trim()}%`})`
    : undefined;

  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(faqs)
      .where(where),
    db.query.faqs.findMany({
      where,
      orderBy: [asc(faqs.order), asc(faqs.question)],
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
export const getFaqByIdService = async (
  id: string
): Promise<TSelectFaq | null> => {
  const faq = await db.query.faqs.findFirst({
    where: eq(faqs.id, id),
  });
  return faq ?? null;
};

// ==========================================
// READ — STATS
// ==========================================
export const getFaqStatsService = async (): Promise<{
  total: number;
  maxOrder: number;
}> => {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      maxOrder: sql<number>`COALESCE(MAX(${faqs.order}), 0)::int`,
    })
    .from(faqs);

  return {
    total: row?.total ?? 0,
    maxOrder: row?.maxOrder ?? 0,
  };
};

// ==========================================
// CREATE
// ==========================================
export const createFaqService = async (
  input: TCreateFaqInput
): Promise<TSelectFaq> => {
  assertNonEmpty(input.question, "Question");
  assertNonEmpty(input.answer, "Answer");

  if (input.order !== undefined && !Number.isInteger(input.order)) {
    throw new Error("order must be an integer");
  }

  // if no order given, put at the end
  let order = input.order;
  if (order === undefined) {
    const [row] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${faqs.order}), 0)::int` })
      .from(faqs);
    order = (row?.maxOrder ?? 0) + 1;
  }

  const [created] = await db
    .insert(faqs)
    .values({
      question: input.question.trim(),
      answer: input.answer.trim(),
      order,
    })
    .returning();

  return created;
};

// ==========================================
// UPDATE
// ==========================================
export const updateFaqService = async (
  id: string,
  input: TUpdateFaqInput
): Promise<TSelectFaq | null> => {
  const existing = await getFaqByIdService(id);
  if (!existing) return null;

  if (input.question !== undefined) {
    assertNonEmpty(input.question, "Question");
  }
  if (input.answer !== undefined) {
    assertNonEmpty(input.answer, "Answer");
  }
  if (input.order !== undefined && !Number.isInteger(input.order)) {
    throw new Error("order must be an integer");
  }

  const [updated] = await db
    .update(faqs)
    .set({
      question: input.question?.trim() ?? existing.question,
      answer: input.answer?.trim() ?? existing.answer,
      order: input.order !== undefined ? input.order : existing.order,
    })
    .where(eq(faqs.id, id))
    .returning();

  return updated ?? null;
};

// ==========================================
// REORDER — bulk update (for drag-and-drop)
// ==========================================
export const reorderFaqsService = async (
  items: TReorderFaqInput[]
): Promise<TSelectFaq[]> => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array");
  }

  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      throw new Error("each item must have a string id");
    }
    if (!Number.isInteger(item.order) || item.order < 0) {
      throw new Error("each item must have a non-negative integer order");
    }
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(faqs)
        .set({ order: item.order })
        .where(eq(faqs.id, item.id));
    }
  });

  return db.query.faqs.findMany({
    orderBy: [asc(faqs.order), asc(faqs.question)],
  });
};

// ==========================================
// DELETE
// ==========================================
export const deleteFaqService = async (id: string): Promise<boolean> => {
  const existing = await getFaqByIdService(id);
  if (!existing) return false;

  await db.delete(faqs).where(eq(faqs.id, id));
  return true;
};