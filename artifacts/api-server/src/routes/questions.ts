import { Router } from "express";
import { db } from "@workspace/db";
import { questionsTable, topicsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const router = Router();

router.get("/questions", async (req, res) => {
  const { topicId, difficulty, limit } = req.query;
  const conditions: SQL[] = [];
  if (topicId) conditions.push(eq(questionsTable.topicId, parseInt(topicId as string)));
  if (difficulty) conditions.push(eq(questionsTable.difficulty, difficulty as string));

  const query = db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit ? parseInt(limit as string) : 1000);

  const rows = await query;
  res.json(rows);
});

router.get("/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db
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
    .where(eq(questionsTable.id, id));

  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

export default router;
