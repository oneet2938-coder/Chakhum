import { Router } from "express";
import { db } from "@workspace/db";
import {
  studentsTable,
  attemptsTable,
  testsTable,
  attemptAnswersTable,
  questionsTable,
  topicsTable,
  settingsTable,
  practiceAnswersTable,
} from "@workspace/db";
import { eq, sql, isNotNull } from "drizzle-orm";

const router = Router();

// ── Settings ──────────────────────────────────────────────────────────────────

router.get("/admin/settings", async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ dailyPracticeTarget: parseInt(map["daily_practice_target"] ?? "20") });
});

router.put("/admin/settings", async (req, res) => {
  const { dailyPracticeTarget } = req.body as { dailyPracticeTarget?: number };
  if (!dailyPracticeTarget || isNaN(dailyPracticeTarget) || dailyPracticeTarget < 1) {
    return res.status(400).json({ error: "dailyPracticeTarget must be a positive number" });
  }
  await db
    .insert(settingsTable)
    .values({ key: "daily_practice_target", value: String(dailyPracticeTarget) })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(dailyPracticeTarget) } });
  res.json({ dailyPracticeTarget });
});

// ── Daily practice report ──────────────────────────────────────────────────────

router.get("/admin/daily-report", async (_req, res) => {
  const [setting] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "daily_practice_target"));
  const target = parseInt(setting?.value ?? "20");

  const students = await db
    .select()
    .from(studentsTable)
    .orderBy(studentsTable.createdAt);

  // Questions from mock tests today
  const testActivity = await db
    .select({
      studentId: attemptsTable.studentId,
      count: sql<number>`count(${attemptAnswersTable.id})::int`,
    })
    .from(attemptAnswersTable)
    .innerJoin(attemptsTable, eq(attemptAnswersTable.attemptId, attemptsTable.id))
    .where(
      sql`DATE(${attemptsTable.completedAt} AT TIME ZONE 'UTC') = CURRENT_DATE
          AND ${attemptsTable.studentId} IS NOT NULL`
    )
    .groupBy(attemptsTable.studentId);

  // Questions from practice section today
  const practiceActivity = await db
    .select({
      studentId: practiceAnswersTable.studentId,
      count: sql<number>`count(*)::int`,
    })
    .from(practiceAnswersTable)
    .where(
      sql`DATE(${practiceAnswersTable.answeredAt} AT TIME ZONE 'UTC') = CURRENT_DATE
          AND ${practiceAnswersTable.studentId} IS NOT NULL`
    )
    .groupBy(practiceAnswersTable.studentId);

  const testMap = Object.fromEntries(testActivity.map((a) => [a.studentId!, a.count]));
  const practiceMap = Object.fromEntries(practiceActivity.map((a) => [a.studentId!, a.count]));

  const report = students.map((s) => {
    const fromTests = testMap[s.id] ?? 0;
    const fromPractice = practiceMap[s.id] ?? 0;
    const questionsToday = fromTests + fromPractice;
    const completed = questionsToday >= target;
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      questionsToday,
      fromTests,
      fromPractice,
      target,
      completed,
      remaining: Math.max(0, target - questionsToday),
    };
  });

  res.json({ target, report });
});

// ── Student list ───────────────────────────────────────────────────────────────

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
  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable);
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
