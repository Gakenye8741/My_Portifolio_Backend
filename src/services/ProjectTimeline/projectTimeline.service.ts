import { desc, eq } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  projectTimeline,
  TInsertProjectTimeline,
  TSelectProjectTimeline,
} from "../../drizzle/schema";

/**
 * ✅ Add a Milestone/Event to the Timeline
 */
/**
 * ✅ Add a Milestone/Event to the Timeline
 */
export const createTimelineEventService = async (
  data: TInsertProjectTimeline
): Promise<TSelectProjectTimeline> => {
  // 🛠️ Convert string date to JS Date object if it exists
  const formattedData = {
    ...data,
    date: data.date ? new Date(data.date) : new Date(),
  };

  const [newEvent] = await db
    .insert(projectTimeline)
    .values(formattedData)
    .returning();
    
  return newEvent;
};

/**
 * ✅ Get Timeline for a Project
 * Sorted by date descending (Newest first)
 */
export const getTimelineByProjectService = async (
  projectId: string
): Promise<TSelectProjectTimeline[]> => {
  return db.query.projectTimeline.findMany({
    where: eq(projectTimeline.projectId, projectId),
    orderBy: [desc(projectTimeline.date)],
  });

};

/**
 * ✅ Update a Timeline Event
 */
export const updateTimelineEventService = async (
  id: string,
  data: Partial<TInsertProjectTimeline>
): Promise<TSelectProjectTimeline | undefined> => {
  const [updated] = await db
    .update(projectTimeline)
    .set(data)
    .where(eq(projectTimeline.id, id))
    .returning();
  return updated;
};

/**
 * ✅ Delete a Timeline Event
 */
export const deleteTimelineEventService = async (id: string): Promise<string> => {
  await db.delete(projectTimeline).where(eq(projectTimeline.id, id));
  return "Timeline event removed ❌";
};