import { inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  orderItems,
  orders,
  variants,
  type ShippingAddress,
} from "../db/schema.js";
import {
  priceCart,
  type CartLine,
  type PriceLookup,
} from "../lib/cart-pricing.js";
import { createPaymentIntent } from "./stripe.service.js";

export interface CheckoutInput {
  /** What the client sends — `{ variantId, qty }` only, never prices. */
  items: CartLine[];
  /** Buyer email; stored lowercased (guests have no account but get claimed later). */
  email: string;
  shippingAddress: ShippingAddress;
  /** The Clerk user id when signed in, else null for a guest checkout. */
  userId: string | null;
}

export interface CheckoutResult {
  orderId: number;
  clientSecret: string;
  totalCents: number;
}

/**
 * Begins a checkout: prices the cart from the catalog, persists a `pending`
 * order, and opens a Stripe PaymentIntent for it.
 *
 * The **server is the sole authority on price**: we load the referenced variants
 * and recompute the total via `priceCart`, ignoring anything the client might
 * claim a line costs. The `pending` order is created first so it has a stable id
 * to put in the PaymentIntent metadata — the `payment_intent.succeeded` webhook
 * (the sole authority on "paid") later resolves that id and fulfills the order.
 * Order items snapshot the priced `unitPriceCents`, which equals the amount
 * charged, so fulfillment only re-verifies stock and flips the status.
 */
export async function createCheckout(
  input: CheckoutInput
): Promise<CheckoutResult> {
  const variantIds = input.items.map((i) => i.variantId);

  const rows = variantIds.length
    ? await db
        .select({ id: variants.id, priceCents: variants.priceCents })
        .from(variants)
        .where(inArray(variants.id, variantIds))
    : [];

  const lookup: PriceLookup = new Map(
    rows.map((r) => [r.id, { priceCents: r.priceCents }])
  );

  // Throws CartPricingError on an empty/duplicate/unknown-variant/bad-qty cart —
  // the controller maps that to a 400 (a cart that can't be priced never pays).
  const priced = priceCart(input.items, lookup);

  const email = input.email.trim().toLowerCase();

  // Insert the order + its priced line snapshots, then attach the PaymentIntent
  // id, in one transaction so a half-created order can't linger.
  const order = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orders)
      .values({
        userId: input.userId,
        email,
        shippingAddress: input.shippingAddress,
        status: "pending",
        totalCents: priced.totalCents,
      })
      .returning({ id: orders.id });
    if (!created) throw new Error("createCheckout: order insert returned no row");

    await tx.insert(orderItems).values(
      priced.lineItems.map((line) => ({
        orderId: created.id,
        variantId: line.variantId,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
      }))
    );

    return created;
  });

  const intent = await createPaymentIntent({
    amountCents: priced.totalCents,
    orderId: order.id,
    email,
  });

  await db
    .update(orders)
    .set({ stripePaymentIntentId: intent.id })
    .where(inArray(orders.id, [order.id]));

  return {
    orderId: order.id,
    clientSecret: intent.clientSecret,
    totalCents: priced.totalCents,
  };
}
