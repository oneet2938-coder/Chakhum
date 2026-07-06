import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("atom"),
  subject: text("subject").notNull().default("physics"),
  classLevel: text("class_level").notNull().default("11"),
});

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topicsTable.$inferSelect;
