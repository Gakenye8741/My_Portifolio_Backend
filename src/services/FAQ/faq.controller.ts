// src/services/FAQ/faq.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listFaqsService,
  getFaqByIdService,
  getFaqStatsService,
  createFaqService,
  updateFaqService,
  reorderFaqsService,
  deleteFaqService,
  TFaqFilters,
  TCreateFaqInput,
  TUpdateFaqInput,
  TReorderFaqInput,
} from "./faq.service";

// ==========================================
// HELPERS
// ==========================================
const getParam = (param: string | string[] | undefined): string | null => {
  if (Array.isArray(param)) return param[0] ?? null;
  return param ?? null;
};

const parseFaqFilters = (query: Request["query"]): TFaqFilters => {
  const filters: TFaqFilters = {};

  if (typeof query.search === "string" && query.search.trim()) {
    filters.search = query.search.trim();
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

const validateCreatePayload = (body: any): TCreateFaqInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (typeof body.question !== "string" || !body.question.trim()) {
    throw new Error("question is required and must be a non-empty string");
  }

  if (typeof body.answer !== "string" || !body.answer.trim()) {
    throw new Error("answer is required and must be a non-empty string");
  }

  if (body.order !== undefined) {
    if (!Number.isInteger(body.order) || body.order < 0) {
      throw new Error("order must be a non-negative integer");
    }
  }

  return {
    question: body.question,
    answer: body.answer,
    order: body.order,
  };
};

const validateUpdatePayload = (body: any): TUpdateFaqInput => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (body.question !== undefined) {
    if (typeof body.question !== "string" || !body.question.trim()) {
      throw new Error("question must be a non-empty string");
    }
  }

  if (body.answer !== undefined) {
    if (typeof body.answer !== "string" || !body.answer.trim()) {
      throw new Error("answer must be a non-empty string");
    }
  }

  if (body.order !== undefined) {
    if (!Number.isInteger(body.order) || body.order < 0) {
      throw new Error("order must be a non-negative integer");
    }
  }

  return body as TUpdateFaqInput;
};

// ==========================================
// PUBLIC — LIST
// ==========================================
export const listFaqs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = parseFaqFilters(req.query);
    const result = await listFaqsService(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PUBLIC — GET BY ID
// ==========================================
export const getFaqById = async (
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

    const faq = await getFaqByIdService(id);
    if (!faq) {
      res.status(404).json({ error: "FAQ not found" });
      return;
    }

    res.status(200).json({ data: faq });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — STATS
// ==========================================
export const getFaqStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getFaqStatsService();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — CREATE
// ==========================================
export const createFaq = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateCreatePayload(req.body);
    const faq = await createFaqService(input);

    res.status(201).json({
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — UPDATE
// ==========================================
export const updateFaq = async (
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

    const input = validateUpdatePayload(req.body);
    const faq = await updateFaqService(id, input);

    if (!faq) {
      res.status(404).json({ error: "FAQ not found" });
      return;
    }

    res.status(200).json({
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — REORDER (bulk)
// ==========================================
export const reorderFaqs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const items = req.body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items must be a non-empty array" });
      return;
    }

    for (const [i, item] of items.entries()) {
      if (typeof item?.id !== "string" || !item.id.trim()) {
        res.status(400).json({ error: `items[${i}].id is required` });
        return;
      }
      if (!Number.isInteger(item?.order) || item.order < 0) {
        res.status(400).json({
          error: `items[${i}].order must be a non-negative integer`,
        });
        return;
      }
    }

    const reordered = await reorderFaqsService(
      items as TReorderFaqInput[]
    );

    res.status(200).json({
      message: "FAQs reordered successfully",
      data: reordered,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN — DELETE
// ==========================================
export const deleteFaq = async (
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

    const ok = await deleteFaqService(id);
    if (!ok) {
      res.status(404).json({ error: "FAQ not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};