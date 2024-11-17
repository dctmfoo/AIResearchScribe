import { pgTable, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("articles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  imageUrl: text("image_url"),
  audioUrl: text("audio_url"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const citations = pgTable("citations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  articleId: integer("article_id").references(() => articles.id).notNull(),
  source: text("source").notNull(),
  author: text("author"),
  year: integer("year"),
  url: text("url"),
  quote: text("quote")
});

export const insertArticleSchema = createInsertSchema(articles);
export const selectArticleSchema = createSelectSchema(articles);
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = z.infer<typeof selectArticleSchema>;

export const insertCitationSchema = createInsertSchema(citations);
export const selectCitationSchema = createSelectSchema(citations);
export type InsertCitation = z.infer<typeof insertCitationSchema>;
export type Citation = z.infer<typeof selectCitationSchema>;
