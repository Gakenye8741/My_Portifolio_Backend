// src/services/Contact/contact.service.ts
import { and, desc, eq, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  messages,
  TSelectMessage,
  messageStatusEnum,
} from "../../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TMessageStatus = "new" | "read" | "replied" | "archived";

export type TCreateMessageInput = {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
};

export type TMessageFilters = {
  status?: TMessageStatus;
  search?: string;
  sortBy?: "createdAt" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type TPaginatedMessages = {
  data: TSelectMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type TMessageStats = {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
  today: number;
  thisWeek: number;
};

// ==========================================
// CONSTANTS
// ==========================================
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

// ==========================================
// VALIDATION HELPERS
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

const isValidEmail = (email: string): boolean => {
  // simple but strict enough for portfolio contact form
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// ==========================================
// CREATE (public — contact form submission)
// ==========================================
export const createMessageService = async (
  input: TCreateMessageInput,
  meta?: { ipAddress?: string | null }
): Promise<TSelectMessage> => {
  // validate name
  assertNonEmpty(input.name, "Name");
  assertLength(input.name, 255, "Name");

  // validate email
  assertNonEmpty(input.email, "Email");
  assertLength(input.email, 255, "Email");
  if (!isValidEmail(input.email)) {
    throw new Error("Email must be a valid email address");
  }

  // validate optional subject
  if (input.subject !== undefined && input.subject !== null) {
    assertLength(input.subject, 255, "Subject");
  }

  // validate message body
  assertNonEmpty(input.message, "Message");
  if (input.message.trim().length < 10) {
    throw new Error("Message must be at least 10 characters");
  }
  if (input.message.length > 5000) {
    throw new Error("Message must be at most 5000 characters");
  }

  const [created] = await db
    .insert(messages)
    .values({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      subject: input.subject?.trim() || null,
      message: input.message.trim(),
      status: "new",
      ipAddress: meta?.ipAddress ?? null,
    })
    .returning();

  return created;
};

// ==========================================
// LIST (admin — paginated, filterable)
// ==========================================
export const listMessagesService = async (
  filters: TMessageFilters = {}
): Promise<TPaginatedMessages> => {
  const {
    status,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = filters;

  const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  // build where
  const whereConditions = [];

  if (status) {
    whereConditions.push(eq(messages.status, status));
  }

  if (search && search.trim()) {
    whereConditions.push(
      sql`(${messages.name} ILIKE ${`%${search.trim()}%`} OR ${messages.email} ILIKE ${`%${search.trim()}%`} OR ${messages.subject} ILIKE ${`%${search.trim()}%`} OR ${messages.message} ILIKE ${`%${search.trim()}%`})`
    );
  }

  const where =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // sort
  const sortColumn =
    sortBy === "status" ? messages.status : messages.createdAt;
  const orderDirection = sortOrder === "asc" ? sql`ASC` : sql`DESC`;

  // count + data
  const [countResult, data] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(messages)
      .where(where),
    db.query.messages.findMany({
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
export const getMessageByIdService = async (
  id: string
): Promise<TSelectMessage | null> => {
  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  });
  return msg ?? null;
};

// ==========================================
// UPDATE STATUS (mark read / replied / archived)
// ==========================================
export const updateMessageStatusService = async (
  id: string,
  status: TMessageStatus
): Promise<TSelectMessage | null> => {
  const valid: TMessageStatus[] = messageStatusEnum.enumValues as TMessageStatus[];
  if (!valid.includes(status)) {
    throw new Error(`status must be one of: ${valid.join(", ")}`);
  }

  const existing = await getMessageByIdService(id);
  if (!existing) return null;

  const updates: Record<string, unknown> = { status };

  // set repliedAt when transitioning to replied
  if (status === "replied" && !existing.repliedAt) {
    updates.repliedAt = new Date();
  }

  const [updated] = await db
    .update(messages)
    .set(updates)
    .where(eq(messages.id, id))
    .returning();

  return updated ?? null;
};

// ==========================================
// MARK AS READ (quick action)
// ==========================================
export const markMessageReadService = async (
  id: string
): Promise<TSelectMessage | null> => {
  const existing = await getMessageByIdService(id);
  if (!existing) return null;

  // don't downgrade replied → read
  if (existing.status === "replied" || existing.status === "archived") {
    return existing;
  }

  return updateMessageStatusService(id, "read");
};

// ==========================================
// MARK AS REPLIED
// ==========================================
export const markMessageRepliedService = async (
  id: string
): Promise<TSelectMessage | null> => {
  return updateMessageStatusService(id, "replied");
};

// ==========================================
// DELETE
// ==========================================
export const deleteMessageService = async (id: string): Promise<boolean> => {
  const existing = await getMessageByIdService(id);
  if (!existing) return false;

  await db.delete(messages).where(eq(messages.id, id));
  return true;
};

// ==========================================
// STATS (admin dashboard overview)
// ==========================================
export const getMessageStatsService = async (): Promise<TMessageStats> => {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      new: sql<number>`COUNT(*) FILTER (WHERE ${messages.status} = 'new')::int`,
      read: sql<number>`COUNT(*) FILTER (WHERE ${messages.status} = 'read')::int`,
      replied: sql<number>`COUNT(*) FILTER (WHERE ${messages.status} = 'replied')::int`,
      archived: sql<number>`COUNT(*) FILTER (WHERE ${messages.status} = 'archived')::int`,
      today: sql<number>`COUNT(*) FILTER (WHERE ${messages.createdAt} >= CURRENT_DATE)::int`,
      thisWeek: sql<number>`COUNT(*) FILTER (WHERE ${messages.createdAt} >= CURRENT_DATE - INTERVAL '7 days')::int`,
    })
    .from(messages);

  return row;
};