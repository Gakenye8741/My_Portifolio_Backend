// src/services/Contact/contact.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  createMessageService,
  listMessagesService,
  getMessageByIdService,
  updateMessageStatusService,
  markMessageReadService,
  markMessageRepliedService,
  deleteMessageService,
  getMessageStatsService,
  TMessageStatus,
  TMessageFilters,
  TCreateMessageInput,
} from "./contact.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseMessageFilters = (query: Request["query"]): TMessageFilters => {
  const filters: TMessageFilters = {};

  if (typeof query.status === "string") {
    const valid: TMessageStatus[] = ["new", "read", "replied", "archived"];
    if (valid.includes(query.status as TMessageStatus)) {
      filters.status = query.status as TMessageStatus;
    } else {
      throw new Error(`Invalid status: ${query.status}`);
    }
  }

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
  }

  if (typeof query.sortBy === "string") {
    const valid = ["createdAt", "status"] as const;
    if (valid.includes(query.sortBy as (typeof valid)[number])) {
      filters.sortBy = query.sortBy as (typeof valid)[number];
    } else {
      throw new Error(`Invalid sortBy: ${query.sortBy}`);
    }
  }

  if (typeof query.sortOrder === "string") {
    const valid = ["asc", "desc"] as const;
    if (valid.includes(query.sortOrder as (typeof valid)[number])) {
      filters.sortOrder = query.sortOrder as (typeof valid)[number];
    } else {
      throw new Error(`Invalid sortOrder: ${query.sortOrder}`);
    }
  }

  if (query.page !== undefined) {
    const n = Number(query.page);
    if (!Number.isInteger(n) || n < 1) {
      throw new Error("page must be a positive integer");
    }
    filters.page = n;
  }

  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new Error("limit must be between 1 and 100");
    }
    filters.limit = n;
  }

  return filters;
};

const validateCreatePayload = (body: any): TCreateMessageInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new Error("name is required and must be a non-empty string");
  }
  if (body.name.length > 255) {
    throw new Error("name must be at most 255 characters");
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    throw new Error("email is required and must be a non-empty string");
  }
  if (body.email.length > 255) {
    throw new Error("email must be at most 255 characters");
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new Error("message is required and must be a non-empty string");
  }

  if (body.subject !== undefined && body.subject !== null) {
    if (typeof body.subject !== "string") {
      throw new Error("subject must be a string or null");
    }
    if (body.subject.length > 255) {
      throw new Error("subject must be at most 255 characters");
    }
  }

  return {
    name: body.name,
    email: body.email,
    subject: body.subject,
    message: body.message,
  };
};

// ==========================================
// PUBLIC — SUBMIT CONTACT FORM
// ==========================================
export const submitContactForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);

    // capture IP for potential spam investigation
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      null;

    const created = await createMessageService(input, { ipAddress });

    // Note: we don't return the full message object publicly —
    // just a confirmation. The message body is for admin eyes only.
    res.status(201).json({
      message: "Thanks for reaching out! I'll get back to you soon.",
      data: {
        id: created.id,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — LIST MESSAGES (inbox)
// ==========================================
export const listMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseMessageFilters(req.query);
    const result = await listMessagesService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — GET MESSAGE BY ID
// ==========================================
export const getMessageById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const msg = await getMessageByIdService(id);
    if (!msg) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(200).json({ data: msg });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE STATUS (general)
// ==========================================
export const updateMessageStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const status = req.body?.status as TMessageStatus | undefined;
    const valid: TMessageStatus[] = ["new", "read", "replied", "archived"];

    if (!status || !valid.includes(status)) {
      res.status(400).json({
        error: `status must be one of: ${valid.join(", ")}`,
      });
      return;
    }

    const updated = await updateMessageStatusService(id, status);
    if (!updated) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(200).json({
      message: `Status updated to ${status}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — MARK READ (quick action)
// ==========================================
export const markMessageRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const updated = await markMessageReadService(id);
    if (!updated) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(200).json({
      message: "Message marked as read",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — MARK REPLIED
// ==========================================
export const markMessageReplied = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const updated = await markMessageRepliedService(id);
    if (!updated) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(200).json({
      message: "Message marked as replied",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE MESSAGE
// ==========================================
export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const ok = await deleteMessageService(id);
    if (!ok) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — STATS (dashboard overview)
// ==========================================
export const getMessageStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getMessageStatsService();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};