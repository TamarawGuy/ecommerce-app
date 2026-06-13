import Stripe from "stripe";

import { env } from "../config/env.js";

/**
 * Thin wrapper around the Stripe SDK — the single place the rest of the backend
 * talks to Stripe, so payment concerns stay out of the checkout/fulfillment
 * services. Mirrors the Clerk webhook service's error-class pattern so the
 * controllers can map failures to status codes.
 */

/** The signing secret for the webhook endpoint isn't configured yet (→ 503). */
export class WebhookNotConfiguredError extends Error {}
/** The webhook signature didn't verify against the secret (→ 400). */
export class WebhookVerificationError extends Error {}

// Lazily constructed so importing this module never requires the SDK to spin up
// (and so tests that don't touch Stripe pay nothing). `STRIPE_SECRET_KEY` is a
// required env var, so it is always present by the time this is called.
let client: Stripe | null = null;
function stripe(): Stripe {
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}

/**
 * Creates a card PaymentIntent for an already-priced, persisted order. The
 * amount is the server-recomputed total (never a client value); `orderId` rides
 * in metadata so the `payment_intent.succeeded` webhook can resolve the order to
 * fulfill. Card-only (Apple/Google Pay are out of scope for v1). Returns the id
 * and client secret the mobile PaymentSheet needs.
 */
export async function createPaymentIntent(args: {
  amountCents: number;
  orderId: number;
  email: string;
}): Promise<{ id: string; clientSecret: string }> {
  const intent = await stripe().paymentIntents.create({
    amount: args.amountCents,
    currency: "usd",
    payment_method_types: ["card"],
    receipt_email: args.email,
    metadata: { orderId: String(args.orderId) },
  });

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a client secret for the PaymentIntent");
  }
  return { id: intent.id, clientSecret: intent.client_secret };
}

/**
 * Verifies a webhook delivery against the configured signing secret and returns
 * the parsed event. The signature is checked over the **raw** request bytes, so
 * the route must use a raw body parser (never `express.json()`). Throws
 * `WebhookNotConfiguredError` when the secret is unset (the endpoint exists but
 * can't verify) and `WebhookVerificationError` on a bad/spoofed signature.
 */
export function constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const secret = env.STRIPE_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    throw new WebhookNotConfiguredError(
      "STRIPE_WEBHOOK_SIGNING_SECRET is not set — run `stripe listen` and configure it"
    );
  }

  try {
    return stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    throw new WebhookVerificationError(
      err instanceof Error ? err.message : "Invalid webhook signature"
    );
  }
}
