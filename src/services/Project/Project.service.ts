import { desc, eq, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  projects,
  TInsertProject,
  TSelectProject,
} from "../../drizzle/schema";

// ✅ Get all projects
export const getAllProjectsService = async (): Promise<TSelectProject[]> => {
  return db.query.projects.findMany({
    orderBy: [desc(projects.createdAt)], 
    with: {
      thumbnail: true,
      techs: true,  
    }
  });
};

// ✅ Get Project By ID - Change parameter type to string
// ✅ Updated Get Project By ID with all relations
export const getProjectByIdService = async (
  id: string
): Promise<any | undefined> => {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      thumbnail: true,      // Requires relation defined in schema
      links: true, 
      techs: true,         // Fetches project_links
      sections: {           // Fetches project_sections
        with: {
          media: true       // Fetches image for each section
        },
        orderBy: (sections, { asc }) => [asc(sections.order)],
      },
      timeline: {           // Fetches project_timeline
        orderBy: (timeline, { desc }) => [desc(timeline.date)],
      }
    },
  });
};

// ✅ Get Project By Slug (Remains string)
export const getProjectBySlugService = async (
  slug: string
): Promise<TSelectProject | undefined> => {
  return db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
};

// ✅ Get Project with Media Assets - Change parameter type to string
export const getProjectWithThumbnailService = async (id: string) => {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      thumbnail: true, 
    },
  });
};

// ✅ Create a project
export const createProjectService = async (
  project: TInsertProject
): Promise<string> => {
  await db.insert(projects).values(project);
  return "Project created successfully ✅";
};

// ✅ Update a project - Change id to string
export const updateProjectService = async (
  id: string,
  project: Partial<TInsertProject>
): Promise<string> => {
  await db
    .update(projects)
    .set(project)
    .where(eq(projects.id, id));
  return "Project updated successfully ✅";
};

// ✅ Delete a project - Change id to string
export const deleteProjectService = async (
  id: string
): Promise<string> => {
  await db.delete(projects).where(eq(projects.id, id));
  return "Project deleted successfully ❌";
};

// ✅ Increment View Count (Optimized Atomic Version)
// We use sql`` to increment directly in the DB to avoid race conditions
export const incrementProjectViewService = async (id: string) => {
  await db
    .update(projects)
    .set({ 
       viewCount: sql`${projects.viewCount} + 1` 
    })
    .where(eq(projects.id, id));
};