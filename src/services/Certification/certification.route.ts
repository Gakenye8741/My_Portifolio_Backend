// src/services/Certification/certification.route.ts
import { Router } from "express";
import {
  listCertifications,
  getCertificationById,
  getCertificationStats,
  createCertification,
  updateCertification,
  deleteCertification,
} from "./certification.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const CertificationRoute = Router();

// ==========================================
// PUBLIC — READ
// ==========================================

// GET /api/certifications — list (paginated, filterable)
CertificationRoute.get("/", listCertifications);

// ==========================================
// ADMIN — READ
// ==========================================

// GET /api/certifications/admin/stats
CertificationRoute.get("/admin/stats", requireAdmin, getCertificationStats);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/certifications
CertificationRoute.post("/", requireAdmin, createCertification);

// PUT /api/certifications/:id
CertificationRoute.put("/:id", requireAdmin, updateCertification);

// DELETE /api/certifications/:id
CertificationRoute.delete("/:id", requireAdmin, deleteCertification);

// ==========================================
// PUBLIC — GET BY ID (LAST — catch-all)
// ==========================================
CertificationRoute.get("/:id", getCertificationById);