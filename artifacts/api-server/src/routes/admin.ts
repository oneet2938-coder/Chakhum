import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, attemptsTable, testsTable, attemptAnswersTable, questionsTable, topicsTable } from "@workspace/db";
import { eq, sql, isNotNull } from "drizzle-orm";

const router = Router();

router.get("/admin/students", async (_req, res) => {
  const students = await db.select().from(studentsTable).orderBy(studentsTable.createdAt);

  const stats = await db
    .select({
      studentId: attemptsTable.studentId,
      testCount: sql<number>`count(distinct ${attemptsTable.id})::int`,
      avgScore: sql<number>`round(avg(${attemptsTable.score}))::int`,
      bestScore: sql<number>`max(${attemptsTable.score})::int`,
      totalQuestions: sql<number>`sum(${attemptsTable.totalQuestions})::int`,
      totalCorrect: sql<number>`sum(${attemptsTable.correctAnswers})::int`,
      lastActivity: sql<string>`max(${attemptsTable.completedAt})::text`,
    })
    .from(attemptsTable)
    .where(isNotNull(attemptsTable.studentId))
    .groupBy(attemptsTable.studentId);

  const statsMap = Object.fromEntries(stats.map((s) => [s.studentId!, s]));

  const result = students.map((s) => {
    const st = statsMap[s.id];
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      joinedAt: s.createdAt.toISOString(),
      testCount: st?.testCount ?? 0,
      avgScore: st?.avgScore ?? 0,
      bestScore: st?.bestScore ?? 0,
      totalQuestions: st?.totalQuestions ?? 0,
      accuracy: st?.totalQuestions ? Math.round((st.totalCorrect / st.totalQuestions) * 100) : 0,
      lastActivity: st?.lastActivity ?? null,
    };
  });

  res.json(result);
});

router.get("/admin/students/:id/attempts", async (req, res) => {
  const studentId = parseInt(req.params.id);
  const rows = await db
    .select({
      id: attemptsTable.id,
      testTitle: testsTable.title,
      score: attemptsTable.score,
      totalQuestions: attemptsTable.totalQuestions,
      correctAnswers: attemptsTable.correctAnswers,
      timeTakenSeconds: attemptsTable.timeTakenSeconds,
      completedAt: attemptsTable.completedAt,
    })
    .from(attemptsTable)
    .innerJoin(testsTable, eq(attemptsTable.testId, testsTable.id))
    .where(eq(attemptsTable.studentId, studentId))
    .orderBy(attemptsTable.completedAt);

  res.json(rows.map((r) => ({ ...r, completedAt: r.completedAt.toISOString() })));
});

router.get("/admin/overview", async (_req, res) => {
  const [studentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(studentsTable);
  const [attemptStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      avgScore: sql<number>`round(coalesce(avg(${attemptsTable.score}), 0))::int`,
    })
    .from(attemptsTable)
    .where(isNotNull(attemptsTable.studentId));

  const topTopics = await db
    .select({
      topicName: topicsTable.name,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${attemptAnswersTable.isCorrect} then 1 else 0 end)::int`,
    })
    .from(attemptAnswersTable)
    .innerJoin(questionsTable, eq(attemptAnswersTable.questionId, questionsTable.id))
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .innerJoin(attemptsTable, eq(attemptAnswersTable.attemptId, attemptsTable.id))
    .where(isNotNull(attemptsTable.studentId))
    .groupBy(topicsTable.name)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  res.json({
    totalStudents: studentCount.count,
    totalAttempts: attemptStats?.total ?? 0,
    avgScore: attemptStats?.avgScore ?? 0,
    topTopics: topTopics.map((t) => ({
      name: t.topicName,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
      attempts: t.total,
    })),
  });
});

export default router;
