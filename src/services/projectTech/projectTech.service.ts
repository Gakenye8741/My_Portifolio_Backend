import { eq, and, inArray } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  projectTechnologies,
  projects,
  technologies,
} from "../../drizzle/schema";

/**
 * ✅ Get all technologies used in a specific project
 */
export const getTechsByProjectService = async (projectId: string) => {
  return db.query.projectTechnologies.findMany({
    where: eq(projectTechnologies.projectId, projectId),
    with: {
      technology: {
        with: { icon: true, skill: true }
      }
    }
  });
};

/**
 * ✅ Link multiple technologies to a project
 * Use this when creating or updating a project's stack
 */
export const addTechsToProjectService = async (
  projectId: string,
  technologyIds: string[]
) => {
  if (technologyIds.length === 0) return [];

  const values = technologyIds.map((techId) => ({
    projectId,
    technologyId: techId,
  }));

  return db.insert(projectTechnologies).values(values).returning();
};

/**
 * ✅ Remove a specific technology from a project
 */
export const removeTechFromProjectService = async (
  projectId: string,
  technologyId: string
) => {
  await db
    .delete(projectTechnologies)
    .where(
      and(
        eq(projectTechnologies.projectId, projectId),
        eq(projectTechnologies.technologyId, technologyId)
      )
    );
  return "Technology unlinked from project 🔗";
};

/**
 * ✅ Sync Project Technologies (The "All-in-One" Update)
 * Deletes existing links and sets the new list provided.
 */
export const syncProjectTechsService = async (
  projectId: string,
  technologyIds: string[]
) => {
  return await db.transaction(async (tx) => {
    // 1. Remove all current links for this project
    await tx
      .delete(projectTechnologies)
      .where(eq(projectTechnologies.projectId, projectId));

    // 2. Add the new set of links
    if (technologyIds.length > 0) {
      const values = technologyIds.map((techId) => ({
        projectId,
        technologyId: techId,
      }));
      await tx.insert(projectTechnologies).values(values);
    }

    return "Project tech stack synchronized successfully ✅";
  });
};