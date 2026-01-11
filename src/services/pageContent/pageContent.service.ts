import { eq } from "drizzle-orm";
import db from "../../drizzle/db";
import { 
  pageContent, 
  pageContentMedia, 
  TInsertPageContent, 
  TInsertPageContentMedia,
  TSelectPageContent,
  TPageContentWithMedia // The joined type we defined earlier
} from "../../drizzle/schema";

/**
 * ✅ Get All Content for a Page
 * Returns: TPageContentWithMedia[]
 */
export const getPageContentService = async (page: string): Promise<TPageContentWithMedia[]> => {
  const results = await db.query.pageContent.findMany({
    where: eq(pageContent.page, page),
    with: {
      images: {
        with: {
          media: true,
        },
        orderBy: (images, { asc }) => [asc(images.displayOrder)],
      },
    },
    orderBy: [pageContent.section],
  });

  return results as TPageContentWithMedia[];
};

/**
 * ✅ Get Specific Content Block by Key
 * Returns: TPageContentWithMedia | null
 */
export const getContentByKeyService = async (key: string): Promise<TPageContentWithMedia | null> => {
  const result = await db.query.pageContent.findFirst({
    where: eq(pageContent.key, key),
    with: {
      images: {
        with: { media: true },
        orderBy: (images, { asc }) => [asc(images.displayOrder)],
      },
    },
  });

  return (result as TPageContentWithMedia) || null;
};

/**
 * ✅ Upsert Content with Gallery
 * Returns: TSelectPageContent (The raw updated row)
 */
export const upsertContentWithGalleryService = async (
  contentData: TInsertPageContent,
  mediaIds: string[] = []
): Promise<TSelectPageContent> => {
  return await db.transaction(async (tx) => {
    // 1. Upsert Text
    const [insertedContent] = await tx
      .insert(pageContent)
      .values(contentData)
      .onConflictDoUpdate({
        target: pageContent.key,
        set: {
          title: contentData.title,
          value: contentData.value,
          lastUpdated: new Date(),
        },
      })
      .returning();

    // 2. Clear old bridge entries
    await tx
      .delete(pageContentMedia)
      .where(eq(pageContentMedia.contentId, insertedContent.id));

    // 3. Insert new bridge entries
    if (mediaIds.length > 0) {
      const mediaLinks: TInsertPageContentMedia[] = mediaIds.map((id, index) => ({
        contentId: insertedContent.id,
        mediaId: id,
        displayOrder: index,
      }));

      await tx.insert(pageContentMedia).values(mediaLinks);
    }

    return insertedContent as TSelectPageContent;
  });
};

/**
 * ✅ Delete Content
 */
export const deletePageContentService = async (id: string): Promise<string> => {
  await db.delete(pageContent).where(eq(pageContent.id, id));
  return "Page content and associated media links deleted successfully ❌";
};