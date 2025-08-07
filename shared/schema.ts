import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  redditId: text("reddit_id").notNull().unique(),
  subreddit: text("subreddit").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  upvotes: integer("upvotes").default(0),
  comments: integer("comments").default(0),
  tags: text("tags").array().default([]),
  priority: text("priority").notNull().default("medium"),
  score: real("score").default(0),
  highlighted: boolean("highlighted").default(false),
  postUrl: text("post_url").notNull(),
  matchReason: text("match_reason").notNull(),
  proposedReply: text("proposed_reply"),
  posted: boolean("posted").default(false),
  confidence: real("confidence").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const monitoringConfig = pgTable("monitoring_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subreddits: text("subreddits").array().notNull(),
  keywords: text("keywords").array().notNull(),
  scanInterval: integer("scan_interval").default(5),
  isActive: boolean("is_active").default(false),
  lastScanTime: timestamp("last_scan_time"),
  totalPosts: integer("total_posts").default(0),
  newPosts: integer("new_posts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  tags: text("tags").array().default([]),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

export const insertMonitoringConfigSchema = createInsertSchema(monitoringConfig).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type MonitoringConfig = typeof monitoringConfig.$inferSelect;
export type InsertMonitoringConfig = z.infer<typeof insertMonitoringConfigSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
