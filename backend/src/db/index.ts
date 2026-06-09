import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

// A small pool against Neon's pooled connection string. The `sslmode=require`
// in NEON_DB_URL enables TLS; Neon presents a valid certificate chain.
export const pool = new pg.Pool({
  connectionString: env.NEON_DB_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
