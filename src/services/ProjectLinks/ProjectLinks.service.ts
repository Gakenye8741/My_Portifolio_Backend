import { eq, desc } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  projectLinks,
  TInsertProjectLink,
  TSelectProjectLink,
} from "../../drizzle/schema";

/**
 * ✅ Get All Links for a Specific Project
 */
export const getLinksByProjectIdService = async (
  projectId: string
): Promise<TSelectProjectLink[]> => {
  return db.query.projectLinks.findMany({
    where: eq(projectLinks.projectId, projectId),
    orderBy: [desc(projectLinks.label)],
  });
};

/**
 * ✅ Create a Single Link
 */
export const createProjectLinkService = async (
  data: TInsertProjectLink
): Promise<TSelectProjectLink> => {
  const [newLink] = await db.insert(projectLinks).values(data).returning();
  return newLink;
};

/**
 * ✅ Bulk Sync Links (The "Professional" way)
 * This replaces all existing links for a project with a new set.
 * Prevents orphaned links and keeps data perfectly synced with your UI state.
 */
export const syncProjectLinksService = async (
  projectId: string,
  links: Omit<TInsertProjectLink, "projectId">[]
): Promise<string> => {
  return await db.transaction(async (tx) => {
    // 1. Delete all existing links for this project
    await tx.delete(projectLinks).where(eq(projectLinks.projectId, projectId));

    // 2. Insert the new set if any are provided
    if (links.length > 0) {
      const linksToInsert = links.map((link) => ({
        ...link,
        projectId,
      }));
      await tx.insert(projectLinks).values(linksToInsert);
    }

    return "Project links synchronized successfully ✅";
  });
};

/**
 * ✅ Update a Single Link
 */
export const updateProjectLinkService = async (
  id: string,
  data: Partial<TInsertProjectLink>
): Promise<TSelectProjectLink | undefined> => {
  const [updatedLink] = await db
    .update(projectLinks)
    .set(data)
    .where(eq(projectLinks.id, id))
    .returning();
  return updatedLink;
};

/**
 * ✅ Delete a Single Link
 */
export const deleteProjectLinkService = async (id: string): Promise<string> => {
  await db.delete(projectLinks).where(eq(projectLinks.id, id));
  return "Link removed ❌";
};