import { Router } from "express";
import { db } from "@workspace/db";
import { attemptsTable, attemptAnswersTable, questionsTable, topicsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/progress/summary", async (req, res) => {
  const attempts = await db.select().from(attemptsTable);

  const totalTestsTaken = attempts.length;
  const totalQuestionsAnswered = attempts.reduce((s, a) => s + a.totalQuestions, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.correctAnswers, 0);
  const accuracy = totalQuestionsAnswered > 0 ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) : 0;
  const averageScore = totalTestsTaken > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalTestsTaken) : 0;
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;

  const topicPerf = await db
    .select({
      topicName: topicsTable.name,
      topicId: topicsTable.id,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${attemptAnswersTable.isCorrect} then 1 else 0 end)::int`,
    })
    .from(attemptAnswersTable)
    .innerJoin(questionsTable, eq(attemptAnswersTable.questionId, questionsTable.id))
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .groupBy(topicsTable.id, topicsTable.name);

  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  topicPerf.forEach((t) => {
    const acc = t.total > 0 ? t.correct / t.total : 0;
    if (acc < 0.5 && t.total >= 3) weakTopics.push(t.topicName);
    if (acc >= 0.75 && t.total >= 3) strongTopics.push(t.topicName);
  });

  res.json({
    totalQuestionsAnswered,
    totalCorrect,
    accuracy,
    totalTestsTaken,
    averageScore,
    bestScore,
    streak: 0,
    weakTopics,
    strongTopics,
  });
});

router.get("/progress/topics", async (req, res) => {
  const topics = await db.select().from(topicsTable);

  const perTopic = await db
    .select({
      topicId: questionsTable.topicId,
      total: sql<number>`count(*)::int`,
    })
    .from(questionsTable)
    .groupBy(questionsTable.topicId);

  const perf = await db
    .select({
      topicId: questionsTable.topicId,
      attempted: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${attemptAnswersTable.isCorrect} then 1 else 0 end)::int`,
    })
    .from(attemptAnswersTable)
    .innerJoin(questionsTable, eq(attemptAnswersTable.questionId, questionsTable.id))
    .groupBy(questionsTable.topicId);

  const totalMap = Object.fromEntries(perTopic.map((p) => [p.topicId, p.total]));
  const perfMap = Object.fromEntries(perf.map((p) => [p.topicId, p]));

  res.json(
    topics.map((t) => {
      const p = perfMap[t.id];
      const attempted = p?.attempted ?? 0;
      const correct = p?.correct ?? 0;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      return {
        topicId: t.id,
        topicName: t.name,
        questionsAttempted: attempted,
        correctAnswers: correct,
        accuracy,
        totalQuestions: totalMap[t.id] ?? 0,
      };
    })
  );
});

export default router;
