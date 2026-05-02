import { Router } from "express";
import { db } from "@workspace/db";
import {
  attemptsTable,
  attemptAnswersTable,
  testsTable,
  questionsTable,
  topicsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { SubmitAttemptBody } from "@workspace/api-zod";

const router = Router();

router.get("/attempts", async (req, res) => {
  const rows = await db
    .select({
      id: attemptsTable.id,
      testId: attemptsTable.testId,
      testTitle: testsTable.title,
      score: attemptsTable.score,
      totalQuestions: attemptsTable.totalQuestions,
      correctAnswers: attemptsTable.correctAnswers,
      timeTakenSeconds: attemptsTable.timeTakenSeconds,
      completedAt: attemptsTable.completedAt,
    })
    .from(attemptsTable)
    .innerJoin(testsTable, eq(attemptsTable.testId, testsTable.id))
    .orderBy(attemptsTable.completedAt);

  res.json(
    rows.map((r) => ({ ...r, completedAt: r.completedAt.toISOString() }))
  );
});

router.post("/attempts", async (req, res) => {
  const parsed = SubmitAttemptBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const { testId, timeTakenSeconds, answers } = parsed.data;

  const questionIds = answers.map((a) => a.questionId);
  const questions =
    questionIds.length > 0
      ? await db
          .select()
          .from(questionsTable)
          .where(inArray(questionsTable.id, questionIds))
      : [];

  const qMap = Object.fromEntries(questions.map((q) => [q.id, q]));
  let correct = 0;
  const answerRows = answers.map((a) => {
    const q = qMap[a.questionId];
    const isCorrect = q ? a.selectedOption === q.correctOption : false;
    if (isCorrect) correct++;
    return { questionId: a.questionId, selectedOption: a.selectedOption ?? null, isCorrect };
  });

  const score = Math.round((correct / answers.length) * 100);

  const [attempt] = await db
    .insert(attemptsTable)
    .values({
      testId,
      score,
      totalQuestions: answers.length,
      correctAnswers: correct,
      timeTakenSeconds,
    })
    .returning();

  await db.insert(attemptAnswersTable).values(
    answerRows.map((a) => ({ ...a, attemptId: attempt.id }))
  );

  res.status(201).json({ ...attempt, completedAt: attempt.completedAt.toISOString() });
});

router.get("/attempts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [attempt] = await db
    .select({
      id: attemptsTable.id,
      testId: attemptsTable.testId,
      testTitle: testsTable.title,
      score: attemptsTable.score,
      totalQuestions: attemptsTable.totalQuestions,
      correctAnswers: attemptsTable.correctAnswers,
      timeTakenSeconds: attemptsTable.timeTakenSeconds,
      completedAt: attemptsTable.completedAt,
    })
    .from(attemptsTable)
    .innerJoin(testsTable, eq(attemptsTable.testId, testsTable.id))
    .where(eq(attemptsTable.id, id));

  if (!attempt) return res.status(404).json({ error: "Not found" });

  const answerRows = await db
    .select({
      questionId: attemptAnswersTable.questionId,
      selectedOption: attemptAnswersTable.selectedOption,
      isCorrect: attemptAnswersTable.isCorrect,
      questionText: questionsTable.text,
      correctOption: questionsTable.correctOption,
      explanation: questionsTable.explanation,
      topicName: topicsTable.name,
    })
    .from(attemptAnswersTable)
    .innerJoin(questionsTable, eq(attemptAnswersTable.questionId, questionsTable.id))
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .where(eq(attemptAnswersTable.attemptId, id));

  res.json({
    ...attempt,
    completedAt: attempt.completedAt.toISOString(),
    answers: answerRows,
  });
});

export default router;
