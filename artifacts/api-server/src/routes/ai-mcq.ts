import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.post("/ai/generate-mcq", async (req, res) => {
  const { text, imageBase64, imageMediaType, topicId, subtopicId, count = 10 } = req.body;

  if (!text && !imageBase64) {
    return res.status(400).json({ error: "Provide text or imageBase64" });
  }

  const clampedCount = Math.min(50, Math.max(1, Number(count)));

  const systemPrompt = `You are an expert NEET/JEE Physics question setter with 20+ years of experience.
Generate exactly ${clampedCount} high-quality multiple choice questions based on the input provided.

Rules:
- Each question must be clear, unambiguous, and at NEET/JEE Class 11-12 Physics level
- Each question must have EXACTLY 4 options (A, B, C, D)
- Each question must have EXACTLY ONE correct answer
- Include a detailed step-by-step explanation for each answer
- Cover varied difficulty: mix of easy, medium, hard
- If generating from an image: extract ALL questions visible in the image and generate additional ones based on the topic/concept shown
- Do NOT include any markdown, backticks, or prose outside the JSON

Return ONLY this exact JSON structure:
{"questions":[{"text":"Question text","options":["Option A","Option B","Option C","Option D"],"correctOption":0,"explanation":"Detailed explanation","difficulty":"easy"}]}

correctOption is 0-indexed (0=A, 1=B, 2=C, 3=D).`;

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
    userContent.push({
      type: "text",
      text: text
        ? `The image above shows a question paper or Physics content. Generate ${clampedCount} MCQs from it. Additional context: ${text}`
        : `The image above shows a question paper or Physics content. Carefully read ALL text in the image and generate ${clampedCount} NEET-level Physics MCQs based on it.`,
    });
  } else {
    userContent.push({
      type: "text",
      text: `Generate ${clampedCount} NEET Physics MCQs from this content:\n\n${text}`,
    });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const block = message.content[0];
    if (block.type !== "text") return res.status(500).json({ error: "Unexpected response type from AI" });

    // Strip any accidental markdown fences
    let jsonText = block.text.trim();
    jsonText = jsonText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

    // Extract JSON object if there's surrounding text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "AI did not return valid JSON", raw: block.text.slice(0, 500) });

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response", raw: block.text.slice(0, 500) });
    }

    const questions = parsed.questions ?? [];
    res.json({ questions, topicId, subtopicId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "AI generation failed" });
  }
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
