import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NEON_DB_URL: z
    .string()
    .min(1, "NEON_DB_URL is required (see backend/.env.example)"),
  // Clerk verifies session JWTs with the secret key; the publishable key lets it
  // resolve the instance's JWKS. Both are required for auth to work.
  CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "CLERK_PUBLISHABLE_KEY is required (see backend/.env.example)"),
  CLERK_SECRET_KEY: z
    .string()
    .min(1, "CLERK_SECRET_KEY is required (see backend/.env.example)"),
  // Optional: the Clerk webhook endpoint is provisioned later (needs a public
  // URL). Until then the server boots fine; the /webhooks/clerk route returns a
  // clear error if it receives a delivery without this secret configured.
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  // Stripe — the secret key authorizes PaymentIntent creation and is required
  // for checkout to work.
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, "STRIPE_SECRET_KEY is required (see backend/.env.example)"),
  // Optional: the webhook signing secret comes from the Stripe CLI in dev
  // (`stripe listen`) or the dashboard in prod. The server boots without it; the
  // /webhooks/stripe route returns 503 until it is set.
  STRIPE_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
