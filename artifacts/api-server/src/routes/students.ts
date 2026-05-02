import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/students/login", async (req, res) => {
  const { name, phone } = req.body as { name?: string; phone?: string };
  if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });

  const existing = await db.select().from(studentsTable).where(eq(studentsTable.phone, phone));
  if (existing.length > 0) {
    return res.json(existing[0]);
  }

  const [student] = await db
    .insert(studentsTable)
    .values({ name, phone })
    .returning();

  return res.status(201).json(student);
});

router.get("/students", async (_req, res) => {
  const students = await db.select().from(studentsTable).orderBy(studentsTable.createdAt);
  res.json(students.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

export default router;
