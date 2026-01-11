import { eq, desc } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  services,
  serviceTechnologies,
  TInsertService,
  TSelectService,
} from "../../drizzle/schema";

/**
 * ✅ Get All Services with Icons and Tech Stack
 */
export const getAllServicesService = async () => {
  return db.query.services.findMany({
    with: {
      icon: true,
      techStack: {
        with: {
          technology: {
            with: { icon: true }
          }
        }
      }
    },
    orderBy: [desc(services.title)],
  });
};

/**
 * ✅ Get Single Service by Slug
 */
export const getServiceBySlugService = async (slug: string) => {
  return db.query.services.findFirst({
    where: eq(services.slug, slug),
    with: {
      icon: true,
      techStack: {
        with: {
          technology: true
        }
      }
    }
  });
};

/**
 * ✅ Create Service with Linked Technologies
 */
export const createServiceWithTechService = async (
  serviceData: TInsertService,
  techIds: string[]
) => {
  return await db.transaction(async (tx) => {
    // 1. Create the Service
    const [newService] = await tx.insert(services).values(serviceData).returning();

    // 2. Link Technologies if any are provided
    if (techIds.length > 0) {
      const techLinks = techIds.map((id) => ({
        serviceId: newService.id,
        technologyId: id,
      }));
      await tx.insert(serviceTechnologies).values(techLinks);
    }

    return newService;
  });
};

/**
 * ✅ Sync/Update Service Technologies
 * This wipes existing links and replaces them with a new set
 */
export const syncServiceTechsService = async (
  serviceId: string,
  techIds: string[]
) => {
  return await db.transaction(async (tx) => {
    // Delete old links
    await tx.delete(serviceTechnologies).where(eq(serviceTechnologies.serviceId, serviceId));

    // Add new links
    if (techIds.length > 0) {
      const techLinks = techIds.map((id) => ({
        serviceId,
        technologyId: id,
      }));
      await tx.insert(serviceTechnologies).values(techLinks);
    }
    
    return "Service tech stack updated 🛠️";
  });
};

/**
 * ✅ Update Service Info
 */
export const updateServiceInfoService = async (
  id: string,
  data: Partial<TInsertService>
) => {
  const [updated] = await db
    .update(services)
    .set(data)
    .where(eq(services.id, id))
    .returning();
  return updated;
};

/**
 * ✅ Delete Service
 */
export const deleteServiceService = async (id: string) => {
  await db.delete(services).where(eq(services.id, id));
  return "Service deleted ❌";
};