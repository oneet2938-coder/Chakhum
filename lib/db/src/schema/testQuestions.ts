import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { testsTable } from "./tests";
import { questionsTable } from "./questions";

export const testQuestionsTable = pgTable("test_questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id),
  questionId: integer("question_id").notNull().references(() => questionsTable.id),
  orderIndex: integer("order_index").notNull().default(0),
});

export type TestQuestion = typeof testQuestionsTable.$inferSelect;
