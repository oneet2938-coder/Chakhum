import { Router } from "express";
import { db } from "@workspace/db";
import { testsTable, testQuestionsTable, questionsTable, topicsTable } from "@workspace/db";
import { eq, inArray, ne } from "drizzle-orm";
import { CreateTestBody } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router = Router();

// ── Admin: list all tests (mastery + custom) ──
router.get("/admin/tests", async (req, res) => {
  try {
    const tests = await db.select({
      id: testsTable.id,
      title: testsTable.title,
      description: testsTable.description,
      test_type: testsTable.testType,
      question_count: testsTable.questionCount,
      duration_minutes: testsTable.durationMinutes,
      difficulty: testsTable.difficulty,
      scheduled_date: testsTable.scheduledDate,
    }).from(testsTable).orderBy(sql`id DESC`);
    res.json(tests);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to fetch tests" });
  }
});

// ── Admin: create a test with specific question IDs ──
router.post("/admin/tests", async (req, res) => {
  const { title, description, testType, questionIds, durationMinutes, difficulty, scheduledDate } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!questionIds?.length) return res.status(400).json({ error: "questionIds are required" });

  const type = testType ?? "custom";
  const duration = Number(durationMinutes) || (type === "short" ? 45 : type === "long" ? 180 : 60);

  try {
    const [test] = await db.insert(testsTable).values({
      title,
      description: description ?? "",
      questionCount: questionIds.length,
      durationMinutes: duration,
      difficulty: difficulty ?? "mixed",
      topicIds: [],
      testType: type,
      scheduledDate: scheduledDate ?? null,
    }).returning();

    if (questionIds.length > 0) {
      await db.insert(testQuestionsTable).values(
        questionIds.map((qid: number, i: number) => ({ testId: test.id, questionId: qid, orderIndex: i }))
      );
    }

    res.status(201).json(test);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to create test" });
  }
});

// ── Admin: delete a test ──
router.delete("/admin/tests/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(testQuestionsTable).where(eq(testQuestionsTable.testId, id));
    await db.delete(testsTable).where(eq(testsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to delete test" });
  }
});

// ── Admin: update questions for a mastery test ──
router.put("/admin/tests/:id/questions", async (req, res) => {
  const id = parseInt(req.params.id);
  const { questionIds } = req.body;
  if (!questionIds?.length) return res.status(400).json({ error: "questionIds required" });

  try {
    await db.delete(testQuestionsTable).where(eq(testQuestionsTable.testId, id));
    await db.insert(testQuestionsTable).values(
      questionIds.map((qid: number, i: number) => ({ testId: id, questionId: qid, orderIndex: i }))
    );
    await db.update(testsTable).set({ questionCount: questionIds.length }).where(eq(testsTable.id, id));
    res.json({ ok: true, count: questionIds.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to update questions" });
  }
});

router.get("/tests", async (req, res) => {
  const { testType } = req.query;
  let tests;
  if (testType === "mastery") {
    tests = await db
      .select()
      .from(testsTable)
      .where(ne(testsTable.testType, "practice"));
  } else if (typeof testType === "string") {
    tests = await db
      .select()
      .from(testsTable)
      .where(eq(testsTable.testType, testType));
  } else {
    tests = await db.select().from(testsTable);
  }
  res.json(tests);
});

router.post("/tests", async (req, res) => {
  const parsed = CreateTestBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const { title, description, topicIds, questionCount, durationMinutes, difficulty } = parsed.data;

  const allQuestions = await db
    .select()
    .from(questionsTable)
    .where(inArray(questionsTable.topicId, topicIds));

  const selected = allQuestions.sort(() => Math.random() - 0.5).slice(0, questionCount);

  const [test] = await db
    .insert(testsTable)
    .values({
      title,
      description: description ?? "",
      questionCount: selected.length,
      durationMinutes,
      difficulty,
      topicIds,
    })
    .returning();

  await db.insert(testQuestionsTable).values(
    selected.map((q, i) => ({ testId: test.id, questionId: q.id, orderIndex: i }))
  );

  res.status(201).json(test);
});

router.get("/tests/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [test] = await db.select().from(testsTable).where(eq(testsTable.id, id));
  if (!test) return res.status(404).json({ error: "Not found" });

  const tqs = await db
    .select()
    .from(testQuestionsTable)
    .where(eq(testQuestionsTable.testId, id));

  const questionIds = tqs.map((tq) => tq.questionId);
  const questions =
    questionIds.length > 0
      ? await db
          .select({
            id: questionsTable.id,
            topicId: questionsTable.topicId,
            topicName: topicsTable.name,
            text: questionsTable.text,
            options: questionsTable.options,
            correctOption: questionsTable.correctOption,
            explanation: questionsTable.explanation,
            difficulty: questionsTable.difficulty,
            year: questionsTable.year,
          })
          .from(questionsTable)
          .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
          .where(inArray(questionsTable.id, questionIds))
      : [];

  res.json({ ...test, questions });
});

export default router;
