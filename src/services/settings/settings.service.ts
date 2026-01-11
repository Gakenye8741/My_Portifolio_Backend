import { eq, inArray } from "drizzle-orm";
import db from "../../drizzle/db";
import { siteSettings, TInsertSiteSetting } from "../../drizzle/schema";

/**
 * ✅ Get All Settings
 */
export const getAllSettingsService = async () => {
  return db.select().from(siteSettings).orderBy(siteSettings.category);
};

/**
 * ✅ Get Settings by Category
 */
export const getSettingsByCategoryService = async (category: string) => {
  return db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.category, category));
};

/**
 * ✅ Get a Single Value by Key
 */
export const getSettingValueService = async (key: string) => {
  const [setting] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return setting?.value || null;
};

/**
 * ✅ Upsert Setting (Update if exists, Insert if new)
 */
export const upsertSettingService = async (data: TInsertSiteSetting) => {
  return db
    .insert(siteSettings)
    .values(data)
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { 
        value: data.value, 
        category: data.category 
      },
    })
    .returning();
};

/**
 * ✅ Bulk Upsert Settings
 * Great for saving an entire settings page at once
 */
export const bulkUpsertSettingsService = async (settingsList: TInsertSiteSetting[]) => {
  return await db.transaction(async (tx) => {
    const results = [];
    for (const setting of settingsList) {
      const [updated] = await tx
        .insert(siteSettings)
        .values(setting)
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: setting.value, category: setting.category },
        })
        .returning();
      results.push(updated);
    }
    return results;
  });
};

/**
 * ✅ Delete a Setting
 */
export const deleteSettingService = async (key: string) => {
  await db.delete(siteSettings).where(eq(siteSettings.key, key));
  return `Setting '${key}' deleted ❌`;
};