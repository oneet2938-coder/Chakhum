import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { questionsTable } from "./questions";

export const practiceAnswersTable = pgTable("practice_answers", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => studentsTable.id),
  questionId: integer("question_id").notNull().references(() => questionsTable.id),
  selectedOption: integer("selected_option"),
  isCorrect: boolean("is_correct").notNull(),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
});

export type PracticeAnswer = typeof practiceAnswersTable.$inferSelect;
