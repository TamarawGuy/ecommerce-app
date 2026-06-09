import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.NEON_DB_URL;
if (!url) {
  throw new Error("NEON_DB_URL is not set — create backend/.env from .env.example");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
