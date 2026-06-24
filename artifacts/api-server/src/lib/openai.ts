import OpenAI from "openai";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getOpenAI(): Promise<OpenAI> {
  let apiKey = process.env["OPENAI_API_KEY"] ?? "";
  try {
    const [row] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "openai_api_key"))
      .limit(1);
    if (row?.value) apiKey = row.value;
  } catch {}
  return new OpenAI({ apiKey });
}

export async function getOpenAIKeyStatus(): Promise<{
  hasEnvKey: boolean;
  hasDbKey: boolean;
  maskedKey: string | null;
}> {
  const hasEnvKey = !!process.env["OPENAI_API_KEY"];
  let hasDbKey = false;
  let maskedKey: string | null = null;
  try {
    const [row] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "openai_api_key"))
      .limit(1);
    if (row?.value) {
      hasDbKey = true;
      const k = row.value;
      maskedKey = k.length > 8 ? `${k.slice(0, 6)}${"*".repeat(k.length - 10)}${k.slice(-4)}` : "****";
    }
  } catch {}
  return { hasEnvKey, hasDbKey, maskedKey };
}
