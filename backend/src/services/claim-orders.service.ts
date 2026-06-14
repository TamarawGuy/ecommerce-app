import { clerkClient } from "@clerk/express";
import { and, inArray, isNull, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { claimableEmails } from "../lib/claim-orders.js";

/**
 * Guest-order claiming — link past **unclaimed** orders to a now-signed-in user
 * by matching email. This is the database half; the security-critical decision
 * of *which* emails may claim is the pure `claimableEmails` (see
 * `lib/claim-orders`), unit-tested apart from the DB.
 *
 * `claimOrders` is intentionally a single, self-contained function so it can be
 * driven from more than one place with no rework:
 *  - **now:** the authenticated order-history fetch (claim-on-read), so a user
 *    who checked out as a guest then signs up sees that order immediately.
 *  - **later (on Render):** the Clerk `user.created` / `user.updated` webhook,
 *    once the backend has a public URL. That call-site is purely additive — it
 *    will resolve verified emails the same way and call this same function.
 */

/**
 * Claims every unclaimed order whose (lowercased) email is in `emails` for this
 * user. Idempotent and safe to call on every read: the `user_id IS NULL` guard
 * means an order claimed on a prior call is skipped now, and an order already
 * owned by someone else is never touched. Returns the number of orders claimed.
 *
 * Emails must already be verified + normalized (lowercased) — that is what
 * `claimableEmails` produces. An empty list is a no-op (no query), so we never
 * run an `= ANY('{}')` that could match nothing or, worse, everything.
 */
export async function claimOrders(
  userId: string,
  emails: string[]
): Promise<number> {
  if (emails.length === 0) return 0;

  const claimed = await db
    .update(orders)
    .set({ userId })
    // `lower(email)` mirrors how the column is matched everywhere; emails are
    // already lowercased, but this keeps the comparison robust regardless.
    // `inArray` binds each email as its own parameter (`lower(email) IN
    // ($1,$2,…)`) — a Postgres array param (`= ANY($1)`) would need `{…}` array-
    // literal syntax the pg driver doesn't produce from a JS string array. Only
    // rows with no owner are claimed — already-owned orders stay put.
    .where(
      and(
        inArray(sql`lower(${orders.email})`, emails),
        isNull(orders.userId)
      )
    )
    .returning({ id: orders.id });

  return claimed.length;
}

/**
 * Resolves the user's verified emails from the Clerk Backend API and claims any
 * matching guest orders. The single entry point used by the order-history fetch.
 *
 * Best-effort by contract: it returns the claim count, but callers treat a
 * thrown error (e.g. Clerk unreachable) as non-fatal — claiming is an
 * enrichment, never a gate on viewing history. The next read will try again.
 */
export async function claimOrdersForUser(userId: string): Promise<number> {
  const user = await clerkClient.users.getUser(userId);
  const emails = claimableEmails(user);
  return claimOrders(userId, emails);
}
