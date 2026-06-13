import { Webhook } from "svix";

import { env } from "../config/env.js";
import { upsertUser } from "./users.service.js";

/**
 * Shape of the parts of a Clerk `user.*` event we consume. Clerk sends much more;
 * we read only what the `users` table needs.
 */
interface ClerkEmailAddress {
  id: string;
  email_address: string;
}
interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
}
interface ClerkEvent {
  type: string;
  data: ClerkUserData;
}

/** The Svix signature headers Clerk sends with every delivery. */
export interface SvixHeaders {
  "svix-id"?: string;
  "svix-timestamp"?: string;
  "svix-signature"?: string;
}

export class WebhookNotConfiguredError extends Error {}
export class WebhookVerificationError extends Error {}

/**
 * Verifies a Clerk webhook delivery against the configured signing secret and,
 * for `user.created` / `user.updated`, syncs the user into the local table.
 *
 * - The signature is verified over the **raw** request body (so the route must
 *   use a raw body parser, never `express.json()`), making the payload
 *   tamper-evident — we never trust an unsigned body.
 * - Upsert keyed on the Clerk `userId` makes re-deliveries idempotent.
 * - Only the **verified primary** email is stored, lowercased. (Guest-order
 *   claiming by that email lives in #12 and is out of scope here.)
 *
 * Returns the event type and whether it resulted in a sync, so the controller
 * can 200 every validly-signed delivery (Clerk only needs a 2xx ack).
 */
export async function handleClerkWebhook(
  rawBody: Buffer,
  headers: SvixHeaders
): Promise<{ type: string; synced: boolean }> {
  const secret = env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    throw new WebhookNotConfiguredError(
      "CLERK_WEBHOOK_SIGNING_SECRET is not set — configure the Clerk webhook endpoint"
    );
  }

  let event: ClerkEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody.toString("utf8"), {
      "svix-id": headers["svix-id"] ?? "",
      "svix-timestamp": headers["svix-timestamp"] ?? "",
      "svix-signature": headers["svix-signature"] ?? "",
    }) as ClerkEvent;
  } catch (err) {
    throw new WebhookVerificationError(
      err instanceof Error ? err.message : "Invalid webhook signature"
    );
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const email = primaryEmail(event.data);
    // No resolvable primary email → nothing to key a user on; ack without sync.
    if (email) {
      const name = fullName(event.data);
      await upsertUser({ id: event.data.id, email, name });
      return { type: event.type, synced: true };
    }
  }

  return { type: event.type, synced: false };
}

/** The user's primary email, lowercased; null if it can't be resolved. */
function primaryEmail(data: ClerkUserData): string | null {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  );
  const raw = primary?.email_address ?? data.email_addresses[0]?.email_address;
  return raw ? raw.trim().toLowerCase() : null;
}

/** "First Last" from Clerk's name fields, or null when both are empty. */
function fullName(data: ClerkUserData): string | null {
  const name = [data.first_name, data.last_name]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(" ")
    .trim();
  return name.length > 0 ? name : null;
}
