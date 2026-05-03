import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

function getStudentId(req: any): number | null {
  const h = req.headers["x-student-id"];
  if (!h) return null;
  const n = parseInt(h as string);
  return isNaN(n) ? null : n;
}

// Admin: list all practice sets
router.get("/admin/practice-sets", async (_req, res) => {
  const sets = await db.execute(sql`
    SELECT ps.id, ps.title, ps.description, ps.practice_date,
           array_length(ps.question_ids, 1) as question_count,
           ps.created_at,
           COUNT(pc.id)::int as completion_count
    FROM daily_practice_sets ps
    LEFT JOIN daily_practice_completions pc ON pc.set_id = ps.id
    GROUP BY ps.id, ps.title, ps.description, ps.practice_date, ps.question_ids, ps.created_at
    ORDER BY ps.practice_date DESC
    LIMIT 30
  `);
  res.json(sets.rows);
});

// Admin: create a practice set
router.post("/admin/practice-sets", async (req, res) => {
  const { title, description, practiceDate, questionIds } = req.body;
  if (!title || !practiceDate || !questionIds?.length) {
    return res.status(400).json({ error: "title, practiceDate, and questionIds required" });
  }

  const pgIntArr = `{${questionIds.join(",")}}`;
  try {
    const result = await db.execute(sql`
      INSERT INTO daily_practice_sets (title, description, practice_date, question_ids)
      VALUES (${title}, ${description ?? ""}, ${practiceDate}::date, ${pgIntArr}::integer[])
      ON CONFLICT (practice_date) DO UPDATE
        SET title = EXCLUDED.title,
            description = EXCLUDED.description,
            question_ids = EXCLUDED.question_ids
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to create practice set" });
  }
});

// Admin: delete a practice set
router.delete("/admin/practice-sets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.execute(sql`DELETE FROM daily_practice_sets WHERE id = ${id}`);
  res.json({ ok: true });
});

// Admin: get completions for a set
router.get("/admin/practice-sets/:id/completions", async (req, res) => {
  const id = parseInt(req.params.id);
  const result = await db.execute(sql`
    SELECT pc.id, s.name, s.phone, pc.score, pc.total, pc.completed_at
    FROM daily_practice_completions pc
    JOIN students s ON s.id = pc.student_id
    WHERE pc.set_id = ${id}
    ORDER BY pc.score DESC
  `);
  res.json(result.rows);
});

// Student: get today's practice set
router.get("/practice-sets/today", async (req, res) => {
  const studentId = getStudentId(req);
  const today = new Date().toISOString().split("T")[0];

  const setResult = await db.execute(sql`
    SELECT ps.id, ps.title, ps.description, ps.practice_date, ps.question_ids
    FROM daily_practice_sets ps
    WHERE ps.practice_date = ${today}::date
    LIMIT 1
  `);

  if (!setResult.rows.length) return res.json(null);

  const set = setResult.rows[0] as any;
  const questionIds: number[] = set.question_ids ?? [];

  let questions: any[] = [];
  if (questionIds.length > 0) {
    const pgArr = `{${questionIds.join(",")}}`;
    const qResult = await db.execute(sql`
      SELECT q.id, q.text, q.options, q.correct_option, q.explanation, q.difficulty, t.name as topic_name
      FROM questions q
      JOIN topics t ON t.id = q.topic_id
      WHERE q.id = ANY(${pgArr}::integer[])
      ORDER BY array_position(${pgArr}::integer[], q.id)
    `);
    questions = qResult.rows.map((r: any) => ({
      id: r.id,
      text: r.text,
      options: r.options,
      correctOption: r.correct_option,
      explanation: r.explanation,
      difficulty: r.difficulty,
      topicName: r.topic_name,
    }));
  }

  let completion = null;
  if (studentId) {
    const compResult = await db.execute(sql`
      SELECT score, total, completed_at FROM daily_practice_completions
      WHERE set_id = ${set.id} AND student_id = ${studentId}
      LIMIT 1
    `);
    if (compResult.rows.length) completion = compResult.rows[0];
  }

  res.json({
    id: set.id,
    title: set.title,
    description: set.description,
    practiceDate: set.practice_date,
    questions,
    completion,
  });
});

// Student: submit practice set completion
router.post("/practice-sets/:id/complete", async (req, res) => {
  const studentId = getStudentId(req);
  if (!studentId) return res.status(401).json({ error: "Not authenticated" });

  const setId = parseInt(req.params.id);
  const { answers } = req.body; // [{ questionId, selectedOption }]

  // Check if already completed (to determine if diamond is being earned for first time)
  const existing = await db.execute(sql`
    SELECT id FROM daily_practice_completions
    WHERE set_id = ${setId} AND student_id = ${studentId}
    LIMIT 1
  `);
  const isFirstTime = !existing.rows.length;

  // Fetch correct answers
  const qIds: number[] = answers.map((a: any) => a.questionId);
  const pgArr = `{${qIds.join(",")}}`;
  const qResult = await db.execute(sql`
    SELECT id, correct_option FROM questions WHERE id = ANY(${pgArr}::integer[])
  `);
  const correctMap = Object.fromEntries(qResult.rows.map((r: any) => [r.id, r.correct_option]));

  let score = 0;
  for (const a of answers) {
    if (correctMap[a.questionId] === a.selectedOption) score++;
  }

  // Save completion record
  await db.execute(sql`
    INSERT INTO daily_practice_completions (set_id, student_id, answers, score, total)
    VALUES (${setId}, ${studentId}, ${JSON.stringify(answers)}::jsonb, ${score}, ${answers.length})
    ON CONFLICT (set_id, student_id) DO UPDATE
      SET answers = EXCLUDED.answers, score = EXCLUDED.score, total = EXCLUDED.total, completed_at = NOW()
  `);

  // Award diamond: insert into practice_answers so gamification system counts them
  // Only insert if first time to avoid duplicate counting
  if (isFirstTime && qIds.length > 0) {
    for (const a of answers) {
      const isCorrect = correctMap[a.questionId] === a.selectedOption;
      await db.execute(sql`
        INSERT INTO practice_answers (student_id, question_id, selected_option, is_correct)
        VALUES (${studentId}, ${a.questionId}, ${a.selectedOption}, ${isCorrect})
      `);
    }
  }

  res.json({ score, total: answers.length, diamondEarned: isFirstTime });
});

export default router;
