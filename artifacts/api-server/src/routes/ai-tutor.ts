import { Router } from "express";
import { getOpenAI } from "../lib/openai";

const router = Router();

const SYSTEM_PROMPT = `You are TSM — an expert AI Physics tutor specializing in NEET and JEE preparation. You have deep expertise in all Physics topics covered in the NEET syllabus: Mechanics, Thermodynamics, Electrostatics, Current Electricity, Magnetism, Optics, Modern Physics, Waves, and more.

Your teaching style:
- Explain concepts clearly and intuitively before diving into math
- Use step-by-step solutions with clear reasoning at every step
- Point out common mistakes students make and how to avoid them
- Relate abstract concepts to real-world examples when helpful
- Use analogies to make difficult concepts easier to grasp
- Highlight which formula to use and WHY it applies
- For numericals: write the given data, identify the formula, substitute, and simplify step by step
- End with a key takeaway or tip when relevant

Formatting:
- Use ** for bold key terms and formulas
- Use numbered steps for solutions
- Keep explanations focused and exam-oriented
- If a student asks something unrelated to physics or academics, gently redirect them

You are talking to a NEET aspirant. Be encouraging, precise, and exam-focused.`;

function getStudentId(req: any): number | null {
  const h = req.headers["x-student-id"];
  if (!h) return null;
  const n = parseInt(h as string);
  return isNaN(n) ? null : n;
}

router.post("/ai/chat", async (req, res) => {
  const studentId = getStudentId(req);
  if (!studentId) return res.status(401).json({ error: "Not authenticated" });

  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "messages array required" });
  }

  const context = messages.slice(-20).map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
  }));

  try {
    const openai = await getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...context,
      ],
    });

    const reply = response.choices[0].message.content ?? "";
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "AI request failed" });
  }
});

export default router;
