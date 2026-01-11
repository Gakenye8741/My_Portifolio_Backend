import { RequestHandler } from "express";
import {
  getAllServicesService,
  getServiceBySlugService,
  createServiceWithTechService,
  updateServiceInfoService,
  syncServiceTechsService,
  deleteServiceService,
} from "./services.service";

/**
 * ✅ GET All Services
 */
export const getAllServices: RequestHandler = async (req, res) => {
  try {
    const services = await getAllServicesService();
    res.status(200).json(services);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch services", details: error.message });
  }
};

/**
 * ✅ GET Service by Slug
 */
export const getServiceBySlug: RequestHandler = async (req, res) => {
  try {
    const { slug } = req.params;
    const service = await getServiceBySlugService(slug);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.status(200).json(service);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch service", details: error.message });
  }
};

/**
 * ✅ POST Create Service + Link Techs
 * Expects: { serviceData: {...}, techIds: ["uuid1", "uuid2"] }
 */
export const createService: RequestHandler = async (req, res) => {
  try {
    const { serviceData, techIds = [] } = req.body;
    const newService = await createServiceWithTechService(serviceData, techIds);
    res.status(201).json(newService);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create service", details: error.message });
  }
};

/**
 * ✅ PUT Update Service Info
 */
export const updateService: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateServiceInfoService(id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update service", details: error.message });
  }
};

/**
 * ✅ PATCH Sync Service Technologies
 * Expects: { techIds: ["uuid1", "uuid2"] }
 */
export const syncServiceTechs: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { techIds } = req.body;
    const message = await syncServiceTechsService(id, techIds);
    res.status(200).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to sync technologies", details: error.message });
  }
};

/**
 * ✅ DELETE Service
 */
export const deleteService: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await deleteServiceService(id);
    res.status(200).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete service", details: error.message });
  }
};