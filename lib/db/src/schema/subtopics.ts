import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { topicsTable } from "./topics";

export const subtopicsTable = pgTable("subtopics", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export type Subtopic = typeof subtopicsTable.$inferSelect;
