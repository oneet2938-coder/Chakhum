import { Router } from "express";
import multer from "multer";
import { getOpenAI } from "../lib/openai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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
- Include a concise but complete explanation for each answer
- Cover varied difficulty: mix of easy, medium, hard
- If the source contains a DIAGRAM, FIGURE, CIRCUIT, GRAPH, or TABLE:
  * Write the question text to reference it naturally (e.g. "In the circuit shown in the figure,", "From the graph shown,", "Refer to the diagram:")
  * Set "hasImage": true for those questions so the diagram image is attached for students
  * For questions NOT based on a diagram, set "hasImage": false
- If generating from plain text with no visual: all questions have "hasImage": false
- Return ONLY raw JSON, no markdown, no backticks, no prose

Return ONLY this exact JSON:
{"questions":[{"text":"Question text","options":["Option A","Option B","Option C","Option D"],"correctOption":0,"explanation":"Explanation","difficulty":"easy","hasImage":false}]}

correctOption is 0-indexed (0=A, 1=B, 2=C, 3=D). difficulty must be "easy", "medium", or "hard".`;

  const userContent: any[] = [];

  if (imageBase64 && imageMediaType) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
    });
    userContent.push({
      type: "text",
      text: text
        ? `Generate ${clampedCount} MCQs from the image and this context: ${text}`
        : `Carefully read the image above and generate ${clampedCount} NEET Physics MCQs from the content shown.`,
    });
  } else {
    userContent.push({
      type: "text",
      text: `Generate ${clampedCount} NEET Physics MCQs from this content:\n\n${text}`,
    });
  }

  try {
    const openai = await getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const rawText = response.choices[0].message.content ?? "";
    let jsonText = rawText.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "AI did not return valid JSON", raw: rawText.slice(0, 500) });

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response", raw: rawText.slice(0, 500) });
    }

    res.json({ questions: parsed.questions ?? [], topicId, subtopicId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "AI generation failed" });
  }
});

// ── Step 1: Analyze content and list all questions found ──
router.post("/ai/analyze-content", async (req, res) => {
  const { text, imageBase64, imageMediaType } = req.body;
  if (!text && !imageBase64) return res.status(400).json({ error: "Provide text or image" });

  const systemPrompt = `You are an expert physics teacher reading a question paper or set of notes.
Your job is to identify ALL distinct questions or problems present in the given content.

For each question found, provide:
- Its number as it appears (Q1, Q2, etc. or Problem 1, 1., etc.) — use sequential integers
- A brief 1-line preview of what the question is about
- The topic/concept it tests (e.g. "Kinematics", "Newton's Laws", "Optics")

Return ONLY this exact JSON, no markdown:
{"found":[{"number":1,"preview":"A ball is thrown upward with velocity 20 m/s...","topic":"Kinematics"},{"number":2,"preview":"...","topic":"..."}],"total":5}`;

  const userContent: any[] = [];
  if (imageBase64 && imageMediaType) {
    userContent.push({ type: "image_url", image_url: { url: `data:${imageMediaType};base64,${imageBase64}` } });
    userContent.push({ type: "text", text: "Identify all questions in this image." });
  } else {
    userContent.push({ type: "text", text: `Identify all questions in this content:\n\n${text}` });
  }

  try {
    const openai = await getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    const rawText = (response.choices[0].message.content ?? "").trim()
      .replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "AI did not return valid JSON", raw: rawText.slice(0, 300) });
    const parsed = JSON.parse(match[0]);
    res.json({ found: parsed.found ?? [], total: parsed.total ?? parsed.found?.length ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Analysis failed" });
  }
});

// ── Step 2: Extract specific questions as proper MCQs ──
router.post("/ai/extract-selected", async (req, res) => {
  const { text, imageBase64, imageMediaType, selectedNumbers, instruction } = req.body;
  if (!text && !imageBase64) return res.status(400).json({ error: "Provide text or image" });
  if (!selectedNumbers?.length && !instruction) return res.status(400).json({ error: "Specify which questions to extract" });

  const selectionDesc = selectedNumbers?.length
    ? `Extract ONLY these question numbers: ${selectedNumbers.join(", ")}`
    : `Extract questions based on this instruction: ${instruction}`;

  const systemPrompt = `You are an expert NEET/JEE Physics question formatter.
${selectionDesc}

Convert each selected question into a proper 4-option MCQ at NEET/JEE level. If the original question already has options, use them. If not, create 3 plausible wrong options plus the correct answer.

Rules:
- Each question must have EXACTLY 4 options (A, B, C, D)
- correctOption is 0-indexed (0=A, 1=B, 2=C, 3=D)
- Include a clear step-by-step explanation
- difficulty: "easy", "medium", or "hard"
- If the question references a DIAGRAM, FIGURE, CIRCUIT, GRAPH, or TABLE visible in the image, set "hasImage": true and write the question text to reference it naturally (e.g. "In the circuit shown,", "From the graph,")
- If the question is purely text-based with no visual element, set "hasImage": false
- Do NOT include questions not requested
- Return ONLY raw JSON, no markdown

Return ONLY:
{"questions":[{"text":"Full question text","options":["A","B","C","D"],"correctOption":0,"explanation":"Step-by-step solution","difficulty":"medium","hasImage":false}]}`;

  const userContent: any[] = [];
  if (imageBase64 && imageMediaType) {
    userContent.push({ type: "image_url", image_url: { url: `data:${imageMediaType};base64,${imageBase64}` } });
    userContent.push({ type: "text", text: `From this image: ${selectionDesc}. Format as NEET MCQs.` });
  } else {
    userContent.push({ type: "text", text: `From this content:\n\n${text}\n\n${selectionDesc}. Format as NEET MCQs.` });
  }

  try {
    const openai = await getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    const rawText = (response.choices[0].message.content ?? "").trim()
      .replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "AI did not return valid JSON", raw: rawText.slice(0, 300) });
    const parsed = JSON.parse(match[0]);
    res.json({ questions: parsed.questions ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Extraction failed" });
  }
});

function toPgArray(arr: string[]): string {
  return "{" + arr.map((s) => '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"').join(",") + "}";
}

router.post("/ai/save-questions", async (req, res) => {
  const { questions, topicId, subtopicId } = req.body;
  if (!questions?.length || !topicId) {
    return res.status(400).json({ error: "questions and topicId required" });
  }

  const inserted: number[] = [];
  for (const q of questions) {
    const pgOpts = toPgArray(q.options);
    const result = await db.execute(sql`
      INSERT INTO questions (topic_id, subtopic_id, text, options, correct_option, explanation, difficulty, image_b64)
      VALUES (
        ${topicId},
        ${subtopicId ?? null},
        ${q.text},
        ${pgOpts}::text[],
        ${q.correctOption},
        ${q.explanation},
        ${q.difficulty ?? "medium"},
        ${q.imageB64 ?? null}
      )
      RETURNING id
    `);
    if (result.rows[0]) inserted.push((result.rows[0] as any).id);
  }

  res.json({ saved: inserted.length, ids: inserted });
});

// ── PDF text extraction ──
router.post("/ai/parse-pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No PDF file uploaded" });
  if (req.file.mimetype !== "application/pdf") return res.status(400).json({ error: "File must be a PDF" });

  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js" as string)).default;
    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim() ?? "";
    res.json({ text, pageCount: data.numpages, charCount: text.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "PDF parsing failed" });
  }
});

export default router;
