import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. ENUMS
// ==========================================
export const projectStatusEnum = pgEnum("project_status", ["draft", "published", "archived"]);
export const techCategoryEnum = pgEnum("tech_category", ["frontend", "backend", "database", "devops", "mobile", "ai"]);
export const linkTypeEnum = pgEnum("link_type", ["github_frontend", "github_backend", "github_fullstack", "live_demo", "documentation", "design"]);
export const pricingTypeEnum = pgEnum("pricing_type", ["hourly", "fixed", "contact"]);
export const messageStatusEnum = pgEnum("message_status", ["new", "read", "replied", "archived"]);
export const subscriberStatusEnum = pgEnum("subscriber_status", ["pending", "confirmed", "unsubscribed"]);

// ==========================================
// 2. AUTH & USERS
// ==========================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("session_user_idx").on(t.userId),
}));

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  diff: text("diff"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  entityIdx: index("audit_entity_idx").on(t.entity, t.entityId),
  createdIdx: index("audit_created_idx").on(t.createdAt),
}));

// ==========================================
// 3. MEDIA
// ==========================================
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  hash: varchar("hash", { length: 64 }).unique(),
  publicId: varchar("public_id", { length: 255 }),        // ← ADD
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 4. SITE CONFIG
// ==========================================
export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).default("general").notNull(),
});

export const socials = pgTable("socials", {
  id: uuid("id").primaryKey().defaultRandom(),
  platform: varchar("platform", { length: 50 }).notNull(),
  url: text("url").notNull(),
  iconName: varchar("icon_name", { length: 50 }).notNull(),
  order: integer("order").default(0).notNull(),
});

export const seoMetadata = pgTable("seo_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageType: varchar("page_type", { length: 50 }).notNull(),
  pageId: uuid("page_id"),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  ogImageId: uuid("og_image_id").references(() => mediaAssets.id),
  canonicalUrl: text("canonical_url"),
  noIndex: boolean("no_index").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  pageIdx: index("seo_page_idx").on(t.pageType, t.pageId),
}));

// ==========================================
// 5. CMS (page content)
// ==========================================
export const pageContent = pgTable("page_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  page: varchar("page", { length: 50 }).notNull(),
  section: varchar("section", { length: 50 }).notNull(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageContentMedia = pgTable("page_content_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull().references(() => pageContent.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").default(0).notNull(),
});

// ==========================================
// 6. PROJECTS
// ==========================================
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  mainDescription: text("main_description").notNull(),
  mainThumbnailId: uuid("main_thumbnail_id").references(() => mediaAssets.id, {
    onDelete: "set null", // if thumbnail deleted, project survives
  }),
  status: projectStatusEnum("status").default("published").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  statusIdx: index("project_status_idx").on(t.status),
  featuredIdx: index("project_featured_idx").on(t.isFeatured),
}));

export const projectLinks = pgTable("project_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 100 }).notNull(),
  url: text("url").notNull(),
  type: linkTypeEnum("type").default("github_fullstack").notNull(),
});

export const projectSections = pgTable("project_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  sectionTitle: varchar("section_title", { length: 255 }),
  explanation: text("explanation"),
  order: integer("order").default(0).notNull(),
});

export const projectTimeline = pgTable("project_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
});

// ==========================================
// 7. TECHNOLOGIES & SKILLS
// ==========================================
export const technologies = pgTable("technologies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  category: techCategoryEnum("category").notNull(),
  iconName: varchar("icon_name", { length: 50 }),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  techId: uuid("tech_id").notNull().unique().references(() => technologies.id, { onDelete: "cascade" }),
  proficiency: integer("proficiency"),
  yearsExperience: integer("years_experience"),
});

export const projectTechnologies = pgTable("project_technologies", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  technologyId: uuid("technology_id").notNull().references(() => technologies.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }),
  yearsUsed: integer("years_used"),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.technologyId] }),
}));

// ==========================================
// 8. SERVICES
// ==========================================
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description").notNull(),
  iconName: varchar("icon_name", { length: 50 }),
  pricingType: pricingTypeEnum("pricing_type").default("contact").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
});

export const serviceTechnologies = pgTable("service_technologies", {
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  technologyId: uuid("technology_id").notNull().references(() => technologies.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.serviceId, t.technologyId] }),
}));

// ==========================================
// 9. BLOG
// ==========================================
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImageId: uuid("cover_image_id").references(() => mediaAssets.id),
  authorId: uuid("author_id").references(() => users.id),
  readingTime: integer("reading_time"),
  viewCount: integer("view_count").default(0).notNull(),
  isFeatured: boolean("featured").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  publishedIdx: index("post_published_idx").on(t.isPublished, t.publishedAt),
}));

export const postRevisions = pgTable("post_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  editedBy: uuid("edited_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  postIdx: index("revision_post_idx").on(t.postId, t.createdAt),
}));

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
});

export const postTags = pgTable("post_tags", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.tagId] }),
}));

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userName: varchar("user_name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postReactions = pgTable("post_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  reaction: varchar("reaction", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postRatings = pgTable("post_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  visitorId: varchar("visitor_id", { length: 100 }).notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("post_rating_uniq").on(t.postId, t.visitorId),
}));

// ==========================================
// 10. PORTFOLIO EXTRAS
// ==========================================
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
  company: varchar("company", { length: 100 }),
  content: text("content").notNull(),
  rating: integer("rating"),
  sourceUrl: text("source_url"),
  authorAvatarId: uuid("author_avatar_id").references(() => mediaAssets.id),
  isPublished: boolean("is_published").default(false).notNull(),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").default(0).notNull(),
});

// ==========================================
// 11. MESSAGES & SUBSCRIBERS
// ==========================================
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  status: messageStatusEnum("status").default("new").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  statusIdx: index("message_status_idx").on(t.status),
  emailIdx: index("message_email_idx").on(t.email),
}));

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  status: subscriberStatusEnum("status").default("pending").notNull(),
  confirmToken: varchar("confirm_token", { length: 64 }),
  confirmedAt: timestamp("confirmed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
});

// ==========================================
// 12. ANALYTICS
// ==========================================
export const pageViews = pgTable("page_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: varchar("path", { length: 255 }).notNull(),
  day: date("day").notNull(),
  count: integer("count").default(0).notNull(),
}, (t) => ({
  uniq: uniqueIndex("page_view_uniq").on(t.path, t.day),
  dayIdx: index("page_view_day_idx").on(t.day),
}));

// ==========================================
// 13. RELATIONS
// ==========================================
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  sessions: many(sessions),
  auditEntries: many(auditLog),
  revisions: many(postRevisions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  projects: many(projects),
  sections: many(projectSections),
  posts: many(posts),
  certifications: many(certifications),
  testimonials: many(testimonials),
  pageContents: many(pageContentMedia),
  seoMetadata: many(seoMetadata),
}));

export const seoMetadataRelations = relations(seoMetadata, ({ one }) => ({
  ogImage: one(mediaAssets, { fields: [seoMetadata.ogImageId], references: [mediaAssets.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  thumbnail: one(mediaAssets, { fields: [projects.mainThumbnailId], references: [mediaAssets.id] }),
  links: many(projectLinks),
  sections: many(projectSections),
  techs: many(projectTechnologies),
  timeline: many(projectTimeline),
}));

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

export const technologiesRelations = relations(technologies, ({ one, many }) => ({
  projectUsage: many(projectTechnologies),
  serviceUsage: many(serviceTechnologies),
  skill: one(skills, { fields: [technologies.id], references: [skills.techId] }),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  technology: one(technologies, { fields: [skills.techId], references: [technologies.id] }),
}));

export const projectTechnologiesRelations = relations(projectTechnologies, ({ one }) => ({
  project: one(projects, { fields: [projectTechnologies.projectId], references: [projects.id] }),
  technology: one(technologies, { fields: [projectTechnologies.technologyId], references: [technologies.id] }),
}));

export const serviceTechnologiesRelations = relations(serviceTechnologies, ({ one }) => ({
  service: one(services, { fields: [serviceTechnologies.serviceId], references: [services.id] }),
  technology: one(technologies, { fields: [serviceTechnologies.technologyId], references: [technologies.id] }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  techStack: many(serviceTechnologies),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  coverImage: one(mediaAssets, { fields: [posts.coverImageId], references: [mediaAssets.id] }),
  comments: many(comments),
  reactions: many(postReactions),
  ratings: many(postRatings),
  tags: many(postTags),
  revisions: many(postRevisions),
}));

export const postRevisionsRelations = relations(postRevisions, ({ one }) => ({
  post: one(posts, { fields: [postRevisions.postId], references: [posts.id] }),
  editor: one(users, { fields: [postRevisions.editedBy], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(posts, { fields: [postReactions.postId], references: [posts.id] }),
}));

export const postRatingsRelations = relations(postRatings, ({ one }) => ({
  post: one(posts, { fields: [postRatings.postId], references: [posts.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  badge: one(mediaAssets, { fields: [certifications.badgeMediaId], references: [mediaAssets.id] }),
}));

export const testimonialsRelations = relations(testimonials, ({ one }) => ({
  avatar: one(mediaAssets, { fields: [testimonials.authorAvatarId], references: [mediaAssets.id] }),
}));

export const pageContentRelations = relations(pageContent, ({ many }) => ({
  images: many(pageContentMedia),
}));

export const pageContentMediaRelations = relations(pageContentMedia, ({ one }) => ({
  content: one(pageContent, { fields: [pageContentMedia.contentId], references: [pageContent.id] }),
  media: one(mediaAssets, { fields: [pageContentMedia.mediaId], references: [mediaAssets.id] }),
}));

// ==========================================
// 14. TYPES
// ==========================================
export type TSelectUser = typeof users.$inferSelect;
export type TInsertUser = typeof users.$inferInsert;
export type TSelectSession = typeof sessions.$inferSelect;
export type TInsertSession = typeof sessions.$inferInsert;
export type TSelectAuditLog = typeof auditLog.$inferSelect;
export type TInsertAuditLog = typeof auditLog.$inferInsert;
export type TSelectMedia = typeof mediaAssets.$inferSelect;
export type TInsertMedia = typeof mediaAssets.$inferInsert;
export type TSelectSiteSetting = typeof siteSettings.$inferSelect;
export type TInsertSiteSetting = typeof siteSettings.$inferInsert;
export type TSelectSocial = typeof socials.$inferSelect;
export type TInsertSocial = typeof socials.$inferInsert;
export type TSelectSeoMetadata = typeof seoMetadata.$inferSelect;
export type TInsertSeoMetadata = typeof seoMetadata.$inferInsert;
export type TSelectPageContent = typeof pageContent.$inferSelect;
export type TInsertPageContent = typeof pageContent.$inferInsert;
export type TSelectPageContentMedia = typeof pageContentMedia.$inferSelect;
export type TInsertPageContentMedia = typeof pageContentMedia.$inferInsert;
export type TSelectProject = typeof projects.$inferSelect;
export type TInsertProject = typeof projects.$inferInsert;
export type TSelectProjectLink = typeof projectLinks.$inferSelect;
export type TInsertProjectLink = typeof projectLinks.$inferInsert;
export type TSelectProjectSection = typeof projectSections.$inferSelect;
export type TInsertProjectSection = typeof projectSections.$inferInsert;
export type TSelectProjectTimeline = typeof projectTimeline.$inferSelect;
export type TInsertProjectTimeline = typeof projectTimeline.$inferInsert;
export type TSelectTech = typeof technologies.$inferSelect;
export type TInsertTech = typeof technologies.$inferInsert;
export type TSelectSkill = typeof skills.$inferSelect;
export type TInsertSkill = typeof skills.$inferInsert;
export type TSelectProjectTech = typeof projectTechnologies.$inferSelect;
export type TInsertProjectTech = typeof projectTechnologies.$inferInsert;
export type TSelectService = typeof services.$inferSelect;
export type TInsertService = typeof services.$inferInsert;
export type TSelectServiceTech = typeof serviceTechnologies.$inferSelect;
export type TInsertServiceTech = typeof serviceTechnologies.$inferInsert;
export type TSelectPost = typeof posts.$inferSelect;
export type TInsertPost = typeof posts.$inferInsert;
export type TSelectPostRevision = typeof postRevisions.$inferSelect;
export type TInsertPostRevision = typeof postRevisions.$inferInsert;
export type TSelectTag = typeof tags.$inferSelect;
export type TInsertTag = typeof tags.$inferInsert;
export type TSelectComment = typeof comments.$inferSelect;
export type TInsertComment = typeof comments.$inferInsert;
export type TSelectPostReaction = typeof postReactions.$inferSelect;
export type TInsertPostReaction = typeof postReactions.$inferInsert;
export type TSelectPostRating = typeof postRatings.$inferSelect;
export type TInsertPostRating = typeof postRatings.$inferInsert;
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
export type TSelectPageView = typeof pageViews.$inferSelect;
export type TInsertPageView = typeof pageViews.$inferInsert;

// Composite types
export type TPageContentWithMedia = TSelectPageContent & {
  images: (TSelectPageContentMedia & { media: TSelectMedia })[];
};

export type TProjectWithRelations = TSelectProject & {
  thumbnail: TSelectMedia | null;
  links: TSelectProjectLink[];
  sections: TSelectProjectSection[];
  techs: (TSelectProjectTech & { technology: TSelectTech })[];
};