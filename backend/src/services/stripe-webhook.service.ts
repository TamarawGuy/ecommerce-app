import type Stripe from "stripe";

import { constructEvent } from "./stripe.service.js";
import { fulfillOrder, type FulfillResult } from "./order-fulfillment.service.js";

/**
 * Verifies a Stripe webhook delivery and acts on it. `payment_intent.succeeded`
 * is the **source of truth for "paid"** — it triggers order fulfillment (the
 * row-locked, idempotent stock decrement + status transition). Every other
 * validly-signed event is acked without action so Stripe marks it delivered.
 *
 * Re-exports the gateway's verification error classes so the controller can map
 * them to status codes (503 not-configured, 400 bad signature) without reaching
 * past this service into the SDK wrapper.
 */
export {
  WebhookNotConfiguredError,
  WebhookVerificationError,
} from "./stripe.service.js";

export interface StripeWebhookResult {
  type: string;
  fulfillment?: FulfillResult;
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<StripeWebhookResult> {
  const event = constructEvent(rawBody, signature);

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const fulfillment = await fulfillOrder(intent.id);
    return { type: event.type, fulfillment };
  }

  return { type: event.type };
}
