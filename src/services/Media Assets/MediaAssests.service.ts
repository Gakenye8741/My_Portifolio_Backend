import { desc, eq, inArray } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  mediaAssets,
  TInsertMedia,
  TSelectMedia,
  projects, // Imported to check usage
} from "../../drizzle/schema";

// ✅ Upload/Create Media Asset
export const createMediaService = async (data: TInsertMedia): Promise<TSelectMedia> => {
  const [newAsset] = await db.insert(mediaAssets).values(data).returning();
  return newAsset;
};

// ✅ Get All Media (Gallery View)
export const getAllMediaService = async (): Promise<TSelectMedia[]> => {
  return db.query.mediaAssets.findMany({
    orderBy: [desc(mediaAssets.createdAt)],
  });
};

// ✅ Get Single Media Asset by ID
export const getMediaByIdService = async (id: string): Promise<TSelectMedia | undefined> => {
  return db.query.mediaAssets.findFirst({
    where: eq(mediaAssets.id, id),
  });
};

// ✅ Delete Media Asset
// Includes a safety check to see if any project is using this image
export const deleteMediaService = async (id: string): Promise<{ success: boolean; message: string }> => {
  // 1. Check if any project is using this as a thumbnail
  const linkedProject = await db.query.projects.findFirst({
    where: eq(projects.mainThumbnailId, id),
  });

  if (linkedProject) {
    return { 
      success: false, 
      message: `Cannot delete. Asset is being used by project: ${linkedProject.title}` 
    };
  }

  // 2. Proceed with deletion
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return { success: true, message: "Media asset deleted successfully ❌" };
};

// ✅ Bulk Get Media (Useful for selecting multiple icons/tech)
export const getBulkMediaService = async (ids: string[]): Promise<TSelectMedia[]> => {
  if (ids.length === 0) return [];
  return db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids));
};

// ✅ Update Media Metadata (e.g., renaming a file)
export const updateMediaService = async (id: string, data: Partial<TInsertMedia>) => {
  return db.update(mediaAssets)
    .set(data)
    .where(eq(mediaAssets.id, id))
    .returning();
};