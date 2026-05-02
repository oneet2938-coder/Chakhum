import { Router } from "express";
import { db } from "@workspace/db";
import { testsTable, testQuestionsTable, questionsTable, topicsTable } from "@workspace/db";
import { eq, inArray, ne } from "drizzle-orm";
import { CreateTestBody } from "@workspace/api-zod";

const router = Router();

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
