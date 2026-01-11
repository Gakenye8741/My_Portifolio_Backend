import { Router } from "express";
import {
  getAllServices,
  getServiceBySlug,
  createService,
  updateService,
  syncServiceTechs,
  deleteService
} from "./services.controller";

export const ServiceRoute = Router();

ServiceRoute.get("/", getAllServices);
ServiceRoute.get("/slug/:slug", getServiceBySlug);
ServiceRoute.post("/", createService);
ServiceRoute.put("/:id", updateService);
ServiceRoute.patch("/:id/techs", syncServiceTechs); // Specialized route for tech stack
ServiceRoute.delete("/:id", deleteService);