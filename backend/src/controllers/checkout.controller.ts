import { getAuth } from "@clerk/express";
import type { Request, Response } from "express";
import { z } from "zod";

import { CartPricingError } from "../lib/cart-pricing.js";
import { createCheckout } from "../services/checkout.service.js";

/**
 * Request shape for `POST /checkout`. The client sends only `variantId` + `qty`
 * per line — **never a price** — plus the buyer's email and shipping address.
 * Zod is the server's own guard on the persisted shape; it never trusts the
 * client to have validated. Optional address fields accept null or absence.
 */
const optionalText = z
  .string()
  .trim()
  .min(1)
  .nullish()
  .transform((v) => v ?? null);

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
  email: z.string().trim().email(),
  shippingAddress: z.object({
    name: z.string().trim().min(1),
    line1: z.string().trim().min(1),
    line2: optionalText,
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postal: z.string().trim().min(1),
    country: z.string().trim().min(1),
    phone: optionalText,
  }),
});

/**
 * Starts a checkout: prices the cart server-side, creates a `pending` order, and
 * opens a Stripe PaymentIntent. Guest-allowed — no `requireUser` — but if a
 * Clerk session is present (the global middleware populates it) the order is
 * linked to that user so it shows in their history. Returns the PaymentIntent
 * client secret for the mobile PaymentSheet.
 */
export async function postCheckout(req: Request, res: Response): Promise<void> {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", message: "Invalid checkout request" });
    return;
  }

  const { userId } = getAuth(req);

  try {
    const result = await createCheckout({
      items: parsed.data.items,
      email: parsed.data.email,
      shippingAddress: parsed.data.shippingAddress,
      userId: userId ?? null,
    });
    res.status(201).json(result);
  } catch (err) {
    // A cart that can't be priced (unknown variant, bad qty) is the client's
    // fault → 400; anything else is ours → 500.
    if (err instanceof CartPricingError) {
      res.status(400).json({ status: "error", message: err.message });
      return;
    }
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
