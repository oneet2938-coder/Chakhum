import { Router } from "express";
import { db } from "@workspace/db";
import { topicsTable, questionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/topics", async (req, res) => {
  const topics = await db.select().from(topicsTable);
  const counts = await db
    .select({ topicId: questionsTable.topicId, count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .groupBy(questionsTable.topicId);
  const countMap = Object.fromEntries(counts.map((c) => [c.topicId, c.count]));
  res.json(
    topics.map((t) => ({
      ...t,
      questionCount: countMap[t.id] ?? 0,
    }))
  );
});

router.get("/topics/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, id));
  if (!topic) return res.status(404).json({ error: "Not found" });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(eq(questionsTable.topicId, id));

  // Fetch subtopics with question counts via raw SQL
  const subtopicsRaw = await db.execute(
    sql`SELECT s.id, s.name, s.order_index, COUNT(q.id)::int as question_count
        FROM subtopics s
        LEFT JOIN questions q ON q.subtopic_id = s.id
        WHERE s.topic_id = ${id}
        GROUP BY s.id, s.name, s.order_index
        ORDER BY s.order_index`
  );

  res.json({
    ...topic,
    questionCount: count,
    subtopics: subtopicsRaw.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      orderIndex: r.order_index,
      questionCount: r.question_count,
    })),
  });
});

export default router;
