import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { questionsTable, topicsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const router = Router();

router.post("/ai/agent-select", async (req, res) => {
  const { instruction, topicId } = req.body;
  if (!instruction?.trim()) {
    return res.status(400).json({ error: "instruction is required" });
  }

  const conditions: SQL[] = [];
  if (topicId) conditions.push(eq(questionsTable.topicId, parseInt(topicId)));

  const questions = await db
    .select({
      id: questionsTable.id,
      topicId: questionsTable.topicId,
      topicName: topicsTable.name,
      text: questionsTable.text,
      options: questionsTable.options,
      correctOption: questionsTable.correctOption,
      explanation: questionsTable.explanation,
      difficulty: questionsTable.difficulty,
    })
    .from(questionsTable)
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(300);

  if (!questions.length) {
    return res.json({ questions: [], reasoning: "No questions found in the question bank for the selected filters.", total: 0 });
  }

  const compact = questions.map((q) => ({
    id: q.id,
    topic: q.topicName,
    difficulty: q.difficulty,
    text: q.text.slice(0, 120) + (q.text.length > 120 ? "…" : ""),
  }));

  const prompt = `You are an AI assistant helping a physics teacher select questions from their question bank.

Teacher's instruction: "${instruction}"

Available questions (${compact.length} total):
${JSON.stringify(compact)}

Select the questions that best match the teacher's instruction. Be precise and selective.

Return ONLY this exact JSON (no markdown, no prose):
{"selected":[<array of question IDs as integers>],"reasoning":"<1-2 sentence explanation of what you selected and why>"}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== "text") return res.status(500).json({ error: "Unexpected AI response" });

    let jsonText = block.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "AI did not return valid JSON", raw: block.text.slice(0, 300) });

    const parsed = JSON.parse(match[0]);
    const selectedIds: number[] = Array.isArray(parsed.selected) ? parsed.selected : [];
    const selectedQuestions = questions.filter((q) => selectedIds.includes(q.id));

    res.json({
      questions: selectedQuestions,
      reasoning: parsed.reasoning ?? "",
      total: questions.length,
      selectedCount: selectedQuestions.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "AI agent failed" });
  }
});

export default router;
