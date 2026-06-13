import { asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { orderItems, orders, variants } from "../db/schema.js";

export type FulfillStatus = "paid" | "cancelled" | "ignored";

export interface FulfillResult {
  status: FulfillStatus;
  orderId?: number;
  /** True when the order was already finalized — a re-delivered webhook no-op. */
  idempotent?: boolean;
}

/**
 * Fulfills an order whose PaymentIntent has succeeded — the **sole authority on
 * "paid"**, driven by the Stripe webhook, never the client. Everything runs in a
 * single transaction with row locks so it is correct under concurrency and
 * re-delivery:
 *
 * 1. Lock the order row (`FOR UPDATE`) by its PaymentIntent id. No such order →
 *    `ignored` (an event for something we don't own).
 * 2. **Idempotency:** if the order isn't `pending` it was already finalized;
 *    return without touching stock. The row lock means a concurrent re-delivery
 *    waits here and then sees the non-pending status — so stock decrements at
 *    most once per order.
 * 3. Lock the order's variants `FOR UPDATE`, ordered by id (deadlock-safe), and
 *    re-verify stock. This lock is what makes the last-unit race safe: two orders
 *    competing for the final item serialize, and the loser sees insufficient
 *    stock.
 * 4. Insufficient stock → mark the order `cancelled` and flag it for refund
 *    (payment already succeeded, so the buyer is owed money back).
 * 5. Otherwise decrement each variant's stock and mark the order `paid`.
 */
export async function fulfillOrder(
  paymentIntentId: string
): Promise<FulfillResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .for("update");

    if (!order) return { status: "ignored" };

    if (order.status !== "pending") {
      return {
        status: order.status as FulfillStatus,
        orderId: order.id,
        idempotent: true,
      };
    }

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const variantIds = items.map((i) => i.variantId);
    const locked = variantIds.length
      ? await tx
          .select({ id: variants.id, stock: variants.stock })
          .from(variants)
          .where(inArray(variants.id, variantIds))
          .orderBy(asc(variants.id))
          .for("update")
      : [];
    const stockById = new Map(locked.map((v) => [v.id, v.stock]));

    const sufficient = items.every(
      (i) => (stockById.get(i.variantId) ?? 0) >= i.qty
    );

    if (!sufficient) {
      await tx
        .update(orders)
        .set({ status: "cancelled", needsRefund: true })
        .where(eq(orders.id, order.id));
      return { status: "cancelled", orderId: order.id };
    }

    for (const item of items) {
      await tx
        .update(variants)
        .set({ stock: sql`${variants.stock} - ${item.qty}` })
        .where(eq(variants.id, item.variantId));
    }

    await tx
      .update(orders)
      .set({ status: "paid" })
      .where(eq(orders.id, order.id));

    return { status: "paid", orderId: order.id };
  });
}
