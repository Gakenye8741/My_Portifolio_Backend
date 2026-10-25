// src/services/Service/service.route.ts
import { Router } from "express";
import {
  listServices,
  getServiceBySlug,
  getServicesByIds,
  getServiceById,
  createService,
  updateService,
  toggleAvailability,
  deleteService,
} from "./service.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const ServiceRoute = Router();

// ==========================================
// PUBLIC — READ
// ==========================================

// GET /api/services — list (paginated, filterable)
ServiceRoute.get("/", listServices);

// GET /api/services/bulk?ids=id1,id2 — bulk fetch
ServiceRoute.get("/bulk", getServicesByIds);

// GET /api/services/slug/:slug — single by slug
ServiceRoute.get("/slug/:slug", getServiceBySlug);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/services
ServiceRoute.post("/", requireAdmin, createService);

// PUT /api/services/:id
ServiceRoute.put("/:id", requireAdmin, updateService);

// PATCH /api/services/:id/availability
ServiceRoute.patch("/:id/availability", requireAdmin, toggleAvailability);

// DELETE /api/services/:id
ServiceRoute.delete("/:id", requireAdmin, deleteService);

// ==========================================
// ADMIN — GET BY ID (LAST — catch-all)
// ==========================================
ServiceRoute.get("/:id", requireAdmin, getServiceById);