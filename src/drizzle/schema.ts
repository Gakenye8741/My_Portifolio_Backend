import { 
  pgTable, uuid, text, varchar, timestamp, 
  integer, boolean, pgEnum, uniqueIndex 
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. ENUMS
// ==========================================
export const roleEnum = pgEnum("user_role", ["admin"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "published", "archived"]);
export const techCategoryEnum = pgEnum("tech_category", ["frontend", "backend", "database", "devops", "mobile", "ai"]);
export const linkTypeEnum = pgEnum("link_type", ["github_frontend", "github_backend", "github_fullstack", "live_demo", "documentation", "design"]);
export const pricingTypeEnum = pgEnum("pricing_type", ["hourly", "fixed", "contact"]);
export const healthStatusEnum = pgEnum("health_status", ["up", "down", "degraded"]);

// ==========================================
// 2. THE TABLES
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(), 
  role: roleEnum("role").default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pageContent = pgTable("page_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  page: varchar("page", { length: 50 }).notNull(),
  section: varchar("section", { length: 50 }).notNull(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  value: text("value"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const pageContentMedia = pgTable("page_content_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull().references(() => pageContent.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").default(0), // To keep images in order
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(), 
  fileType: varchar("file_type", { length: 50 }), 
  fileSize: integer("file_size"), 
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(), 
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).default("general"),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  mainDescription: text("main_description").notNull(),
  mainThumbnailId: uuid("main_thumbnail_id").references(() => mediaAssets.id),
  status: projectStatusEnum("status").default("published"),
  isFeatured: boolean("is_featured").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("slug_idx").on(table.slug),
}));

export const projectLinks = pgTable("project_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 100 }).notNull(), 
  url: text("url").notNull(),
  type: linkTypeEnum("type").default("github_fullstack"),
});

export const projectSections = pgTable("project_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").references(() => mediaAssets.id),
  sectionTitle: varchar("section_title", { length: 255 }),
  explanation: text("explanation"),
  order: integer("order").default(0),
});

export const projectTimeline = pgTable("project_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  // Change the key from 'changeTitle' to 'title' to match the column name
  title: varchar("title", { length: 100 }).notNull(), 
  description: text("description"),
  date: timestamp("date").defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  content: text("content").notNull(),
  coverImageId: uuid("cover_image_id").references(() => mediaAssets.id),
  authorId: uuid("author_id").references(() => users.id),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  userName: varchar("user_name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const technologies = pgTable("technologies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  category: techCategoryEnum("category").notNull(),
  iconId: uuid("icon_id").references(() => mediaAssets.id),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  techId: uuid("tech_id").references(() => technologies.id),
  proficiency: integer("proficiency"), 
  yearsExperience: integer("years_experience"),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description").notNull(),
  iconId: uuid("icon_id").references(() => mediaAssets.id),
  pricingType: pricingTypeEnum("pricing_type").default("contact"),
  isAvailable: boolean("is_available").default(true),
});

export const projectTechnologies = pgTable("project_technologies", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  technologyId: uuid("technology_id").notNull().references(() => technologies.id, { onDelete: "cascade" }),
});

export const serviceTechnologies = pgTable("service_technologies", {
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  technologyId: uuid("technology_id").notNull().references(() => technologies.id, { onDelete: "cascade" }),
});

export const certifications = pgTable("certifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  issuer: varchar("issuer", { length: 255 }).notNull(), 
  badgeMediaId: uuid("badge_media_id").references(() => mediaAssets.id),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  authorRole: varchar("author_role", { length: 100 }), 
  content: text("content").notNull(),
  authorAvatarId: uuid("author_avatar_id").references(() => mediaAssets.id),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").default(0),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").default(true),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

export const projectViews = pgTable("project_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

export const serviceStatus = pgTable("service_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  status: healthStatusEnum("status").default("up"),
  lastChecked: timestamp("last_checked").defaultNow(),
});

// 1. User Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

// 2. Media Assets Relations (Updated to include pageContent)
export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  projects: many(projects),
  technologies: many(technologies),
  sections: many(projectSections),
  posts: many(posts),
  certifications: many(certifications),
  testimonials: many(testimonials),
  techIcons: many(technologies),
  pageContents: many(pageContent), // Added: Link to CMS content
}));

// 3. Project Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  thumbnail: one(mediaAssets, {
    fields: [projects.mainThumbnailId],
    references: [mediaAssets.id],
  }),
  links: many(projectLinks),
  sections: many(projectSections),
  techs: many(projectTechnologies),
  timeline: many(projectTimeline),
  views: many(projectViews),
}));

// 4. Project Children Relations
export const projectLinksRelations = relations(projectLinks, ({ one }) => ({
  project: one(projects, { fields: [projectLinks.projectId], references: [projects.id] }),
}));

export const projectSectionsRelations = relations(projectSections, ({ one }) => ({
  project: one(projects, { fields: [projectSections.projectId], references: [projects.id] }),
  media: one(mediaAssets, { fields: [projectSections.mediaId], references: [mediaAssets.id] }),
}));

export const projectTimelineRelations = relations(projectTimeline, ({ one }) => ({
  project: one(projects, { fields: [projectTimeline.projectId], references: [projects.id] }),
}));

export const projectViewsRelations = relations(projectViews, ({ one }) => ({
  project: one(projects, { fields: [projectViews.projectId], references: [projects.id] }),
}));

// 5. Tech & Skills Relations
export const technologiesRelations = relations(technologies, ({ one, many }) => ({
  icon: one(mediaAssets, { 
    fields: [technologies.iconId], 
    references: [mediaAssets.id] 
  }),
  projectUsage: many(projectTechnologies),
  serviceUsage: many(serviceTechnologies),
  skill: one(skills, { 
    fields: [technologies.id], 
    references: [skills.techId] 
  }),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  technology: one(technologies, { 
    fields: [skills.techId], 
    references: [technologies.id] 
  }),
}));

// 6. Bridge / Pivot Table Relations
export const projectTechnologiesRelations = relations(projectTechnologies, ({ one }) => ({
  project: one(projects, { fields: [projectTechnologies.projectId], references: [projects.id] }),
  technology: one(technologies, { fields: [projectTechnologies.technologyId], references: [technologies.id] }),
}));

export const serviceTechnologiesRelations = relations(serviceTechnologies, ({ one }) => ({
  service: one(services, { fields: [serviceTechnologies.serviceId], references: [services.id] }),
  technology: one(technologies, { fields: [serviceTechnologies.technologyId], references: [technologies.id] }),
}));

// 7. Services Relations
export const servicesRelations = relations(services, ({ one, many }) => ({
  icon: one(mediaAssets, { fields: [services.iconId], references: [mediaAssets.id] }),
  techStack: many(serviceTechnologies),
}));

// 8. Blog & Social Relations
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  coverImage: one(mediaAssets, { fields: [posts.coverImageId], references: [mediaAssets.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

// 9. Other Portfolio Item Relations
export const certificationsRelations = relations(certifications, ({ one }) => ({
  badge: one(mediaAssets, { fields: [certifications.badgeMediaId], references: [mediaAssets.id] }),
}));

export const testimonialsRelations = relations(testimonials, ({ one }) => ({
  avatar: one(mediaAssets, { fields: [testimonials.authorAvatarId], references: [mediaAssets.id] }),
}));

// 10. Page Content Relations (NEW: For your CMS)
export const pageContentRelations = relations(pageContent, ({ many }) => ({
  images: many(pageContentMedia),
}));

export const pageContentMediaRelations = relations(pageContentMedia, ({ one }) => ({
  content: one(pageContent, { fields: [pageContentMedia.contentId], references: [pageContent.id] }),
  media: one(mediaAssets, { fields: [pageContentMedia.mediaId], references: [mediaAssets.id] }),
}));


// ==========================================
// 4. TYPES
// ==========================================
export type TSelectUser = typeof users.$inferSelect;
export type TInsertUser = typeof users.$inferInsert;
export type TSelectMedia = typeof mediaAssets.$inferSelect;
export type TInsertMedia = typeof mediaAssets.$inferInsert;
export type TSelectSiteSetting = typeof siteSettings.$inferSelect;
export type TInsertSiteSetting = typeof siteSettings.$inferInsert;
export type TSelectProject = typeof projects.$inferSelect;
export type TInsertProject = typeof projects.$inferInsert;
export type TSelectProjectLink = typeof projectLinks.$inferSelect;
export type TInsertProjectLink = typeof projectLinks.$inferInsert;
export type TSelectProjectSection = typeof projectSections.$inferSelect;
export type TInsertProjectSection = typeof projectSections.$inferInsert;
export type TSelectProjectTimeline = typeof projectTimeline.$inferSelect;
export type TInsertProjectTimeline = typeof projectTimeline.$inferInsert;
export type TSelectPost = typeof posts.$inferSelect;
export type TInsertPost = typeof posts.$inferInsert;
export type TSelectComment = typeof comments.$inferSelect;
export type TInsertComment = typeof comments.$inferInsert;
export type TSelectService = typeof services.$inferSelect;
export type TInsertService = typeof services.$inferInsert;
export type TSelectTech = typeof technologies.$inferSelect;
export type TInsertTech = typeof technologies.$inferInsert;
export type TSelectSkill = typeof skills.$inferSelect;
export type TInsertSkill = typeof skills.$inferInsert;
export type TSelectCertification = typeof certifications.$inferSelect;
export type TInsertCertification = typeof certifications.$inferInsert;
export type TSelectTestimonial = typeof testimonials.$inferSelect;
export type TInsertTestimonial = typeof testimonials.$inferInsert;
export type TSelectFaq = typeof faqs.$inferSelect;
export type TInsertFaq = typeof faqs.$inferInsert;
export type TSelectMessage = typeof messages.$inferSelect;
export type TInsertMessage = typeof messages.$inferInsert;
export type TSelectSubscriber = typeof subscribers.$inferSelect;
export type TInsertSubscriber = typeof subscribers.$inferInsert;
export type TSelectProjectView = typeof projectViews.$inferSelect;
export type TInsertProjectView = typeof projectViews.$inferInsert;
export type TSelectServiceStatus = typeof serviceStatus.$inferSelect;
export type TInsertServiceStatus = typeof serviceStatus.$inferInsert;
// 📄 Page Content Types (The Text/Configuration)
export type TSelectPageContent = typeof pageContent.$inferSelect;
export type TInsertPageContent = typeof pageContent.$inferInsert;

// 🖼️ Page Content Media Types (The Multi-Image Bridge)
export type TSelectPageContentMedia = typeof pageContentMedia.$inferSelect;
export type TInsertPageContentMedia = typeof pageContentMedia.$inferInsert;

// Add this custom type to your schema.ts file
export type TPageContentWithMedia = TSelectPageContent & {
  images: (TSelectPageContentMedia & {
    media: TSelectMedia;
  })[];
};