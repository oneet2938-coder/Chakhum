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
import { eq, sql, isNotNull, inArray } from "drizzle-orm";
import { getOpenAIKeyStatus } from "../lib/openai";

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

  // Fetch every (studentId, questionId) answered in practice today — raw rows, dedup in JS
  const practiceToday = await db
    .select({
      studentId: practiceAnswersTable.studentId,
      questionId: practiceAnswersTable.questionId,
    })
    .from(practiceAnswersTable)
    .where(
      sql`DATE(${practiceAnswersTable.answeredAt} AT TIME ZONE 'UTC') = CURRENT_DATE
          AND ${practiceAnswersTable.studentId} IS NOT NULL`
    );

  // Same for test attempt answers today
  const testsToday = await db
    .select({
      studentId: attemptsTable.studentId,
      questionId: attemptAnswersTable.questionId,
    })
    .from(attemptAnswersTable)
    .innerJoin(attemptsTable, eq(attemptAnswersTable.attemptId, attemptsTable.id))
    .where(
      sql`DATE(${attemptsTable.completedAt} AT TIME ZONE 'UTC') = CURRENT_DATE
          AND ${attemptsTable.studentId} IS NOT NULL`
    );

  // Build per-student Sets so each question only counts once even if done in both practice + test
  const practiceQs: Record<number, Set<number>> = {};
  const testQs: Record<number, Set<number>> = {};
  const allQs: Record<number, Set<number>> = {};

  for (const r of practiceToday) {
    const id = r.studentId!;
    (practiceQs[id] ??= new Set()).add(r.questionId);
    (allQs[id] ??= new Set()).add(r.questionId);
  }
  for (const r of testsToday) {
    const id = r.studentId!;
    (testQs[id] ??= new Set()).add(r.questionId);
    (allQs[id] ??= new Set()).add(r.questionId);
  }

  const report = students.map((s) => {
    const fromPractice = (practiceQs[s.id] ?? new Set()).size;
    const fromTests    = (testQs[s.id]    ?? new Set()).size;
    const questionsToday = (allQs[s.id]   ?? new Set()).size; // true distinct union
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
      courseType: s.courseType,
      status: s.status,
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

// ── Top 5 Students detailed report ────────────────────────────────────────────
router.get("/admin/top-students", async (_req, res) => {
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "daily_practice_target"));
  const target = parseInt(setting?.value ?? "20");

  const students = await db.select().from(studentsTable).orderBy(studentsTable.createdAt);

  // Gather gamification stats for every student to pick the top 5
  const allStats = await Promise.all(
    students.map(async (s) => {
      const practiceRows = await db
        .select({
          day: sql<string>`DATE(${practiceAnswersTable.answeredAt} AT TIME ZONE 'UTC')::text`,
          questionId: practiceAnswersTable.questionId,
        })
        .from(practiceAnswersTable)
        .where(eq(practiceAnswersTable.studentId, s.id));

      const testRows = await db
        .select({
          day: sql<string>`DATE(${attemptsTable.completedAt} AT TIME ZONE 'UTC')::text`,
          questionId: attemptAnswersTable.questionId,
        })
        .from(attemptAnswersTable)
        .innerJoin(attemptsTable, eq(attemptAnswersTable.attemptId, attemptsTable.id))
        .where(sql`${attemptsTable.studentId} = ${s.id}`);

      const dayQs: Record<string, Set<number>> = {};
      const allQs = new Set<number>();
      for (const r of practiceRows) { (dayQs[r.day] ??= new Set()).add(r.questionId); allQs.add(r.questionId); }
      for (const r of testRows)     { (dayQs[r.day] ??= new Set()).add(r.questionId); allQs.add(r.questionId); }

      return {
        ...s,
        totalQuestions: allQs.size,
        diamonds: Object.values(dayQs).filter((set) => set.size >= target).length,
        dayQs,
      };
    })
  );

  allStats.sort((a, b) => b.diamonds - a.diamonds || b.totalQuestions - a.totalQuestions);
  const top5 = allStats.slice(0, 5);

  const detailed = await Promise.all(
    top5.map(async (s) => {
      // Topic accuracy — practice answers
      const practiceAnswers = await db
        .select({
          questionId: practiceAnswersTable.questionId,
          isCorrect: practiceAnswersTable.isCorrect,
          topicName: topicsTable.name,
        })
        .from(practiceAnswersTable)
        .innerJoin(questionsTable, eq(practiceAnswersTable.questionId, questionsTable.id))
        .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
        .where(eq(practiceAnswersTable.studentId, s.id));

      // Topic accuracy — test answers
      const testAnswers = await db
        .select({
          questionId: attemptAnswersTable.questionId,
          isCorrect: attemptAnswersTable.isCorrect,
          topicName: topicsTable.name,
        })
        .from(attemptAnswersTable)
        .innerJoin(attemptsTable, eq(attemptAnswersTable.attemptId, attemptsTable.id))
        .innerJoin(questionsTable, eq(attemptAnswersTable.questionId, questionsTable.id))
        .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
        .where(sql`${attemptsTable.studentId} = ${s.id}`);

      // Per topic: track each distinct questionId; mark correct if EVER answered correctly
      const topicData: Record<string, Map<number, boolean>> = {};
      for (const r of [...practiceAnswers, ...testAnswers]) {
        (topicData[r.topicName] ??= new Map()).set(
          r.questionId,
          r.isCorrect || (topicData[r.topicName].get(r.questionId) ?? false)
        );
      }

      const topicStats = Object.entries(topicData)
        .map(([topicName, qMap]) => {
          const total   = qMap.size;
          const correct = [...qMap.values()].filter(Boolean).length;
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
          return { topicName, total, correct, accuracy };
        })
        .sort((a, b) => b.total - a.total);

      // Last 14 days activity
      const recentActivity: { date: string; count: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        recentActivity.push({ date: dateStr, count: s.dayQs[dateStr]?.size ?? 0 });
      }

      const activeDays   = Object.keys(s.dayQs).length;
      const avgPerDay    = activeDays > 0 ? Math.round(s.totalQuestions / activeDays) : 0;

      // Test performance
      const [testStats] = await db
        .select({
          avgScore:  sql<number>`round(coalesce(avg(${attemptsTable.score}), 0))::int`,
          testCount: sql<number>`count(*)::int`,
          bestScore: sql<number>`coalesce(max(${attemptsTable.score}), 0)::int`,
        })
        .from(attemptsTable)
        .where(eq(attemptsTable.studentId, s.id));

      return {
        id:          s.id,
        name:        s.name,
        phone:       s.phone,
        totalQuestions: s.totalQuestions,
        diamonds:    s.diamonds,
        activeDays,
        avgPerDay,
        testCount:   testStats?.testCount  ?? 0,
        avgScore:    testStats?.avgScore   ?? 0,
        bestScore:   testStats?.bestScore  ?? 0,
        topicStats:  topicStats.slice(0, 10),
        weakTopics:  topicStats.filter((t) => t.total >= 2 && t.accuracy < 50).slice(0, 5),
        strongTopics: topicStats.filter((t) => t.total >= 2 && t.accuracy >= 80).slice(0, 4),
        recentActivity,
      };
    })
  );

  res.json(detailed);
});

// ── Student Approvals ─────────────────────────────────────────────────────────

router.get("/admin/approvals", async (_req, res) => {
  const rows = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.status, "pending"))
    .orderBy(studentsTable.createdAt);
  // Only test_only students need approval — foundation is auto-approved
  res.json(rows
    .filter((s) => s.courseType === "test_only")
    .map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))
  );
});

router.put("/admin/students/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
  const [updated] = await db
    .update(studentsTable)
    .set({ status: "approved" })
    .where(eq(studentsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "student not found" });
  res.json(updated);
});

router.put("/admin/students/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
  const [updated] = await db
    .update(studentsTable)
    .set({ status: "rejected" })
    .where(eq(studentsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "student not found" });
  res.json(updated);
});

router.delete("/admin/students/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
  // cascade: attempt_answers → attempts → student; practice_answers → student
  const studentAttempts = await db
    .select({ id: attemptsTable.id })
    .from(attemptsTable)
    .where(eq(attemptsTable.studentId, id));
  const attemptIds = studentAttempts.map((a) => a.id);
  if (attemptIds.length > 0) {
    await db.delete(attemptAnswersTable).where(inArray(attemptAnswersTable.attemptId, attemptIds));
    await db.delete(attemptsTable).where(eq(attemptsTable.studentId, id));
  }
  await db.delete(practiceAnswersTable).where(eq(practiceAnswersTable.studentId, id));
  const [deleted] = await db.delete(studentsTable).where(eq(studentsTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "student not found" });
  res.json({ ok: true });
});

router.put("/admin/students/:id/course-type", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
  const { courseType } = req.body as { courseType?: string };
  if (courseType !== "test_only" && courseType !== "foundation") {
    return res.status(400).json({ error: "courseType must be 'test_only' or 'foundation'" });
  }
  // When switching to test_only (Mastery), set status to pending so teacher can approve
  // When switching to foundation, auto-approve
  const status = courseType === "foundation" ? "approved" : "pending";
  const [updated] = await db
    .update(studentsTable)
    .set({ courseType, status })
    .where(eq(studentsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "student not found" });
  res.json(updated);
});

// ── OpenAI API Key management ──────────────────────────────────────────────────

router.get("/admin/settings/openai-key", async (_req, res) => {
  const status = await getOpenAIKeyStatus();
  res.json(status);
});

router.post("/admin/settings/openai-key", async (req, res) => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
    return res.status(400).json({ error: "Valid API key required (must start with sk-...)" });
  }
  const key = apiKey.trim();
  await db
    .insert(settingsTable)
    .values({ key: "openai_api_key", value: key })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: key } });
  res.json({ ok: true, message: "API key saved" });
});

router.delete("/admin/settings/openai-key", async (_req, res) => {
  await db.delete(settingsTable).where(eq(settingsTable.key, "openai_api_key"));
  res.json({ ok: true, message: "Custom API key removed, using environment variable" });
});

export default router;
