import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testsTable } from "./tests";
import { studentsTable } from "./students";

export const attemptsTable = pgTable("attempts", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id),
  studentId: integer("student_id").references(() => studentsTable.id),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  timeTakenSeconds: integer("time_taken_seconds").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertAttemptSchema = createInsertSchema(attemptsTable).omit({ id: true, completedAt: true });
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type Attempt = typeof attemptsTable.$inferSelect;
