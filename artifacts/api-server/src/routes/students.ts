import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/students/login", async (req, res) => {
  const { name, phone, courseType } = req.body as { name?: string; phone?: string; courseType?: string };
  if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });

  const existing = await db.select().from(studentsTable).where(eq(studentsTable.phone, phone));
  if (existing.length > 0) {
    return res.json(existing[0]);
  }

  const resolvedCourseType = courseType === "test_only" ? "test_only" : "foundation";
  // Foundation is always auto-approved; test_only needs teacher approval
  const status = resolvedCourseType === "foundation" ? "approved" : "pending";

  const [student] = await db
    .insert(studentsTable)
    .values({ name, phone, status, courseType: resolvedCourseType })
    .returning();

  return res.status(201).json(student);
});

router.get("/students", async (_req, res) => {
  const students = await db.select().from(studentsTable).orderBy(studentsTable.createdAt);
  res.json(students.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

export default router;
