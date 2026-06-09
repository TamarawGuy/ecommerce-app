import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

export interface HealthResult {
  status: "ok";
  db: "connected";
  checkedAt: string;
}

/**
 * Performs a real round-trip to Neon to prove the connection is live.
 * Throws if the database is unreachable.
 */
export async function checkHealth(): Promise<HealthResult> {
  const result = await db.execute(sql`SELECT 1 AS ok`);
  const rows = result.rows as Array<{ ok: number }>;
  if (rows[0]?.ok !== 1) {
    throw new Error("Unexpected health query result");
  }
  return {
    status: "ok",
    db: "connected",
    checkedAt: new Date().toISOString(),
  };
}
