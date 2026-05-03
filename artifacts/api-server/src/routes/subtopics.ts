import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/subtopics/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  const subtopicRaw = await db.execute(
    sql`SELECT s.id, s.name, s.topic_id, t.name as topic_name
        FROM subtopics s
        JOIN topics t ON t.id = s.topic_id
        WHERE s.id = ${id}
        LIMIT 1`
  );

  if (!subtopicRaw.rows.length) return res.status(404).json({ error: "Not found" });
  const sub = subtopicRaw.rows[0] as any;

  const questionsRaw = await db.execute(
    sql`SELECT q.id, q.text, q.options, q.correct_option, q.explanation, q.difficulty, q.year
        FROM questions q
        WHERE q.subtopic_id = ${id}
        ORDER BY q.id`
  );

  res.json({
    id: sub.id,
    name: sub.name,
    topicId: sub.topic_id,
    topicName: sub.topic_name,
    questions: questionsRaw.rows.map((r: any) => ({
      id: r.id,
      text: r.text,
      options: r.options,
      correctOption: r.correct_option,
      explanation: r.explanation,
      difficulty: r.difficulty,
      year: r.year,
    })),
  });
});

export default router;
