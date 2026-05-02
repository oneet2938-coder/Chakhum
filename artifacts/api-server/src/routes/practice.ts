import { Router } from "express";
import { db } from "@workspace/db";
import { practiceAnswersTable, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getStudentId(req: any): number | null {
  const h = req.headers["x-student-id"];
  if (!h) return null;
  const n = parseInt(h as string);
  return isNaN(n) ? null : n;
}

router.post("/practice/answer", async (req, res) => {
  const { questionId, selectedOption } = req.body as {
    questionId?: number;
    selectedOption?: number;
  };

  if (questionId == null) return res.status(400).json({ error: "questionId is required" });

  const studentId = getStudentId(req);

  const [question] = await db
    .select({ correctOption: questionsTable.correctOption })
    .from(questionsTable)
    .where(eq(questionsTable.id, questionId));

  if (!question) return res.status(404).json({ error: "Question not found" });

  const isCorrect = selectedOption != null && selectedOption === question.correctOption;

  const [row] = await db
    .insert(practiceAnswersTable)
    .values({ studentId, questionId, selectedOption: selectedOption ?? null, isCorrect })
    .returning();

  res.status(201).json(row);
});

export default router;
