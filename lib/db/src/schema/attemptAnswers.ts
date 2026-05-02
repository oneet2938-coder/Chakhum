import { pgTable, serial, integer, boolean } from "drizzle-orm/pg-core";
import { attemptsTable } from "./attempts";
import { questionsTable } from "./questions";

export const attemptAnswersTable = pgTable("attempt_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => attemptsTable.id),
  questionId: integer("question_id").notNull().references(() => questionsTable.id),
  selectedOption: integer("selected_option"),
  isCorrect: boolean("is_correct").notNull(),
});

export type AttemptAnswer = typeof attemptAnswersTable.$inferSelect;
