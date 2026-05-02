import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, practiceAnswersTable, attemptsTable, attemptAnswersTable, settingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function getDailyTarget(): Promise<number> {
  const [s] = await db.select().from(settingsTable).where(eq(settingsTable.key, "daily_practice_target"));
  return parseInt(s?.value ?? "20");
}

async function getStudentStats(studentId: number, target: number) {
  // Fetch every (day, questionId) pair from practice — no aggregation so we can deduplicate in JS
  const practiceRows = await db
    .select({
      day: sql<string>`DATE(${practiceAnswersTable.answeredAt} AT TIME ZONE 'UTC')::text`,
      questionId: practiceAnswersTable.questionId,
    })
    .from(practiceAnswersTable)
    .where(eq(practiceAnswersTable.studentId, studentId));

  // Same for test attempts
  const testRows = await db
    .select({
      day: sql<string>`DATE(${attemptsTable.completedAt} AT TIME ZONE 'UTC')::text`,
      questionId: attemptAnswersTable.questionId,
    })
    .from(attemptAnswersTable)
    .innerJoin(attemptsTable, eq(attemptAnswersTable.attemptId, attemptsTable.id))
    .where(sql`${attemptsTable.studentId} = ${studentId}`);

  // Build day → Set<questionId> for per-day dedup, and a global set for all-time dedup
  const dayQuestions: Record<string, Set<number>> = {};
  const allQuestions = new Set<number>();

  for (const r of practiceRows) {
    (dayQuestions[r.day] ??= new Set()).add(r.questionId);
    allQuestions.add(r.questionId);
  }
  for (const r of testRows) {
    (dayQuestions[r.day] ??= new Set()).add(r.questionId);
    allQuestions.add(r.questionId);
  }

  // totalQuestions = distinct question IDs ever answered (across both practice + tests)
  const totalQuestions = allQuestions.size;

  // diamonds = days where distinct questions answered that day >= target
  const diamonds = Object.values(dayQuestions).filter((s) => s.size >= target).length;

  return { totalQuestions, diamonds };
}

export const RANKS = [
  { level: 1,  title: "Intern",            minQ: 0,     color: "text-slate-400",   bg: "bg-slate-500/15",   border: "border-slate-500/25",  icon: "🩺" },
  { level: 2,  title: "Medical Student",   minQ: 50,    color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/25",   icon: "📚" },
  { level: 3,  title: "House Surgeon",     minQ: 150,   color: "text-cyan-400",    bg: "bg-cyan-500/15",    border: "border-cyan-500/25",   icon: "✂️" },
  { level: 4,  title: "Junior Resident",   minQ: 350,   color: "text-teal-400",    bg: "bg-teal-500/15",    border: "border-teal-500/25",   icon: "🏥" },
  { level: 5,  title: "Senior Resident",   minQ: 700,   color: "text-green-400",   bg: "bg-green-500/15",   border: "border-green-500/25",  icon: "💊" },
  { level: 6,  title: "Registrar",         minQ: 1200,  color: "text-purple-400",  bg: "bg-purple-500/15",  border: "border-purple-500/25", icon: "🔬" },
  { level: 7,  title: "Specialist",        minQ: 2000,  color: "text-indigo-400",  bg: "bg-indigo-500/15",  border: "border-indigo-500/25", icon: "🧬" },
  { level: 8,  title: "Consultant",        minQ: 3500,  color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/25",  icon: "👨‍⚕️" },
  { level: 9,  title: "Senior Consultant", minQ: 5500,  color: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/25", icon: "🏆" },
  { level: 10, title: "Chief Physician",   minQ: 10000, color: "text-yellow-300",  bg: "bg-yellow-500/20",  border: "border-yellow-500/40", icon: "⭐" },
];

function getRankObj(totalQ: number) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (totalQ >= r.minQ) rank = r;
  }
  return rank;
}

// ── Student's own gamification stats ──────────────────────────────────────────
router.get("/gamification/me", async (req, res) => {
  const h = req.headers["x-student-id"];
  if (!h) return res.status(401).json({ error: "No student ID" });
  const studentId = parseInt(h as string);
  if (isNaN(studentId)) return res.status(400).json({ error: "Invalid student ID" });

  const target = await getDailyTarget();
  const { totalQuestions, diamonds } = await getStudentStats(studentId, target);
  const rank = getRankObj(totalQuestions);

  res.json({ totalQuestions, diamonds, rank, target });
});

// ── Leaderboard (all students) ────────────────────────────────────────────────
router.get("/leaderboard", async (_req, res) => {
  const target = await getDailyTarget();
  const students = await db.select().from(studentsTable).orderBy(studentsTable.createdAt);

  const rows = await Promise.all(
    students.map(async (s) => {
      const { totalQuestions, diamonds } = await getStudentStats(s.id, target);
      const rank = getRankObj(totalQuestions);
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        totalQuestions,
        diamonds,
        rank,
        joinedAt: s.createdAt.toISOString(),
      };
    })
  );

  rows.sort((a, b) => b.diamonds - a.diamonds || b.totalQuestions - a.totalQuestions);
  res.json(rows.map((r, i) => ({ ...r, position: i + 1 })));
});

export default router;
