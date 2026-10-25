import { Request, Response, NextFunction } from "express";

// Known "domain" errors we want to expose
const STATUS_MAP: Array<{ match: RegExp; status: number }> = [
  { match: /email already registered/i, status: 409 },
  { match: /invalid email or password/i, status: 401 },
  { match: /invalid registration input/i, status: 400 },
  { match: /not authenticated/i, status: 401 },
  { match: /forbidden/i, status: 403 },
  { match: /not found/i, status: 404 },
];

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const message = err instanceof Error ? err.message : "Unknown error";

  // Try to map a known message → status
  const matched = STATUS_MAP.find((m) => m.match.test(message));
  const status = matched?.status ?? 500;

  // Log 500s server-side so you can debug, but never leak stack to client
  if (status >= 500) {
    console.error("💥 Unhandled error:", err);
  }

  // In production, hide internal 500 messages from clients
  const clientMessage =
    status === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : message;

  res.status(status).json({ error: clientMessage });
};

// 404 handler for unknown routes
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ error: "Route not found" });
};