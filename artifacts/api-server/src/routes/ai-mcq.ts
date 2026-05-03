import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.post("/ai/generate-mcq", async (req, res) => {
  const { text, imageBase64, imageMediaType, topicId, subtopicId, count = 5 } = req.body;

  if (!text && !imageBase64) {
    return res.status(400).json({ error: "Provide text or imageBase64" });
  }

  const systemPrompt = `You are an expert NEET/JEE Physics question setter with 20+ years of experience.
Generate exactly ${count} high-quality multiple choice questions based on the input provided.
Each question must:
- Be clear and unambiguous
- Have exactly 4 options (A, B, C, D)
- Have exactly one correct answer
- Include a detailed explanation
- Be appropriate for NEET/JEE level (Class 11-12 Physics)

Return ONLY valid JSON in this exact format, no markdown, no extra text:
{
  "questions": [
    {
      "text": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,
      "explanation": "Detailed explanation here",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

  const userContent: any[] = [];

  if (imageBase64 && imageMediaType) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageMediaType,
        data: imageBase64,
      },
    });
  }

  if (text) {
    userContent.push({ type: "text", text: `Generate ${count} MCQs from this content:\n\n${text}` });
  } else {
    userContent.push({ type: "text", text: `Generate ${count} MCQs from the image above.` });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const block = message.content[0];
  if (block.type !== "text") return res.status(500).json({ error: "Unexpected response" });

  let parsed: any;
  try {
    const jsonText = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(jsonText);
  } catch {
    return res.status(500).json({ error: "Failed to parse AI response", raw: block.text });
  }

  res.json({ questions: parsed.questions ?? [], topicId, subtopicId });
});

router.post("/ai/save-questions", async (req, res) => {
  const { questions, topicId, subtopicId } = req.body;
  if (!questions?.length || !topicId) {
    return res.status(400).json({ error: "questions and topicId required" });
  }

  const inserted: number[] = [];
  for (const q of questions) {
    const result = await db.execute(sql`
      INSERT INTO questions (topic_id, subtopic_id, text, options, correct_option, explanation, difficulty)
      VALUES (
        ${topicId},
        ${subtopicId ?? null},
        ${q.text},
        ${JSON.stringify(q.options)}::text[],
        ${q.correctOption},
        ${q.explanation},
        ${q.difficulty ?? "medium"}
      )
      RETURNING id
    `);
    if (result.rows[0]) inserted.push((result.rows[0] as any).id);
  }

  res.json({ saved: inserted.length, ids: inserted });
});

export default router;
