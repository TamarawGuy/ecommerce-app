import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users, type NewUser, type User } from "../db/schema.js";

/** Looks up a synced user by Clerk `userId`. Null until the webhook has run. */
export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/**
 * Inserts or updates a user from Clerk's webhook payload. Keyed by the Clerk
 * `userId`, so a re-delivered `user.created` or a later `user.updated` simply
 * refreshes the email/name — the handler is idempotent. `createdAt` is only set
 * on insert (left untouched on update). Email is expected pre-lowercased by the
 * caller (the webhook reads the verified primary address).
 */
export async function upsertUser(input: NewUser): Promise<User> {
  const [row] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.id,
      set: { email: input.email, name: input.name ?? null },
    })
    .returning();
  // An upsert with RETURNING always yields exactly one row; the guard satisfies
  // the type checker (and would catch a driver contract change).
  if (!row) throw new Error("upsertUser: insert returned no row");
  return row;
}
