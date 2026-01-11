import { eq, asc } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  projectSections,
  TInsertProjectSection,
  TSelectProjectSection,
} from "../../drizzle/schema";

/**
 * ✅ Add a New Section to a Project
 */
export const createSectionService = async (
  data: TInsertProjectSection
): Promise<TSelectProjectSection> => {
  const [newSection] = await db.insert(projectSections).values(data).returning();
  return newSection;
};

/**
 * ✅ Get All Sections for a Project (Ordered)
 * We use the 'order' column to ensure the story flows correctly
 */
export const getSectionsByProjectService = async (
  projectId: string
): Promise<TSelectProjectSection[]> => {
  return db.query.projectSections.findMany({
    where: eq(projectSections.projectId, projectId),
    with: {
      media: true, // Pulls the associated image/video details
    },
    orderBy: [asc(projectSections.order)],
  });
};

/**
 * ✅ Bulk Reorder Sections
 * Useful for drag-and-drop UI where you change the position of multiple items
 */
export const reorderSectionsService = async (
  items: { id: string; order: number }[]
): Promise<string> => {
  return await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(projectSections)
        .set({ order: item.order })
        .where(eq(projectSections.id, item.id));
    }
    return "Sections reordered successfully 🔃";
  });
};

/**
 * ✅ Update Section Content
 */
export const updateSectionService = async (
  id: string,
  data: Partial<TInsertProjectSection>
): Promise<TSelectProjectSection | undefined> => {
  const [updated] = await db
    .update(projectSections)
    .set(data)
    .where(eq(projectSections.id, id))
    .returning();
  return updated;
};

/**
 * ✅ Delete a Section
 */
export const deleteSectionService = async (id: string): Promise<string> => {
  await db.delete(projectSections).where(eq(projectSections.id, id));
  return "Section deleted ❌";
};