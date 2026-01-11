import { eq, desc, and } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  technologies,
  skills,
  mediaAssets,
  TInsertTech,
  TInsertSkill,
  TSelectTech,
  TSelectSkill,
  TSelectMedia,
} from "../../drizzle/schema";

// Define a custom type for the combined response
export type TTechWithSkill = TSelectTech & {
  skill: TSelectSkill | null;
  icon: TSelectMedia | null;
};

/**
 * ✅ Get All Tech & Skills (Detailed)
 * Includes category filtering and icon data
 */
export const getAllTechSkillsService = async (category?: string): Promise<TTechWithSkill[]> => {
  return db.query.technologies.findMany({
    where: category ? eq(technologies.category, category as any) : undefined,
    with: {
      icon: true,
      skill: true,
    },
    orderBy: [desc(technologies.name)],
  }) as unknown as TTechWithSkill[];
};

/**
 * ✅ Create Tech + Skill (Detailed Transaction)
 */
export const createTechWithSkillService = async (
  techData: TInsertTech,
  skillData: { proficiency: number; yearsExperience: number }
): Promise<TTechWithSkill> => {
  return await db.transaction(async (tx) => {
    // 1. Create the Tech entry
    const [newTech] = await tx.insert(technologies).values(techData).returning();

    // 2. Create the Skill entry linked to the new Tech ID
    const [newSkill] = await tx
      .insert(skills)
      .values({
        techId: newTech.id,
        proficiency: skillData.proficiency,
        yearsExperience: skillData.yearsExperience,
      })
      .returning();

    // 3. Fetch icon details if iconId was provided
    let icon = null;
    if (newTech.iconId) {
      icon = await tx.query.mediaAssets.findFirst({
        where: eq(mediaAssets.id, newTech.iconId),
      }) || null;
    }

    return { ...newTech, skill: newSkill, icon };
  });
};

/**
 * ✅ Update Tech & Skill (Detailed)
 */
export const updateTechSkillService = async (
  techId: string,
  data: {
    techUpdates?: Partial<TInsertTech>;
    skillUpdates?: Partial<Omit<TInsertSkill, "techId">>;
  }
): Promise<TTechWithSkill | undefined> => {
  return await db.transaction(async (tx) => {
    // Update Technology table
    if (data.techUpdates) {
      await tx
        .update(technologies)
        .set(data.techUpdates)
        .where(eq(technologies.id, techId));
    }

    // Update Skills table
    if (data.skillUpdates) {
      await tx
        .update(skills)
        .set(data.skillUpdates)
        .where(eq(skills.techId, techId));
    }

    // Return the full updated object
    return tx.query.technologies.findFirst({
      where: eq(technologies.id, techId),
      with: { skill: true, icon: true },
    }) as unknown as TTechWithSkill;
  });
};

/**
 * ✅ Delete Tech (and Skill via Cascade)
 */
export const deleteTechService = async (id: string): Promise<void> => {
  await db.delete(technologies).where(eq(technologies.id, id));
};