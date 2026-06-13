import type { Request, Response } from "express";

import {
  handleClerkWebhook,
  WebhookNotConfiguredError,
  WebhookVerificationError,
  type SvixHeaders,
} from "../services/clerk-webhook.service.js";
import {
  handleStripeWebhook,
  WebhookNotConfiguredError as StripeWebhookNotConfiguredError,
  WebhookVerificationError as StripeWebhookVerificationError,
} from "../services/stripe-webhook.service.js";

/**
 * Clerk webhook receiver. The route is mounted with a raw body parser, so
 * `req.body` is the exact bytes Clerk signed — required for Svix verification.
 *
 * Status codes are chosen for how Clerk's dashboard treats them:
 * - 401 on a bad/missing signature (rejects spoofed deliveries).
 * - 503 when the signing secret isn't configured yet (the endpoint exists but
 *   can't verify — surfaced as a retryable failure rather than a silent 200).
 * - 200 for any validly-signed event, even one we don't act on, so Clerk marks
 *   it delivered and doesn't retry.
 */
export async function postClerkWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await handleClerkWebhook(
      req.body as Buffer,
      req.headers as SvixHeaders
    );
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    if (err instanceof WebhookNotConfiguredError) {
      res.status(503).json({ status: "error", message: err.message });
      return;
    }
    if (err instanceof WebhookVerificationError) {
      res.status(401).json({ status: "error", message: err.message });
      return;
    }
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * Stripe webhook receiver. Like the Clerk route it is mounted with a raw body
 * parser so `req.body` is the exact bytes Stripe signed (required for signature
 * verification). `payment_intent.succeeded` is the source of truth for "paid"
 * and drives order fulfillment.
 *
 * Status codes follow how Stripe treats them:
 * - 400 on a bad/missing signature (Stripe's own convention — it won't retry a
 *   400, which is correct for an unverifiable, likely-spoofed body).
 * - 503 when the signing secret isn't configured yet (retryable).
 * - 200 for any validly-signed event, even one we don't act on, so Stripe marks
 *   it delivered.
 */
export async function postStripeWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await handleStripeWebhook(
      req.body as Buffer,
      req.headers["stripe-signature"] as string
    );
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    if (err instanceof StripeWebhookNotConfiguredError) {
      res.status(503).json({ status: "error", message: err.message });
      return;
    }
    if (err instanceof StripeWebhookVerificationError) {
      res.status(400).json({ status: "error", message: err.message });
      return;
    }
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
