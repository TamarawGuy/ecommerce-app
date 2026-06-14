import { desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { orderItems, orders, products, variants } from "../db/schema.js";

/**
 * A line on an order, enriched for display. `order_items` stores only
 * `(variant_id, qty, unit_price_cents)`; the history screen needs the product
 * and variant snapshot to render each line, so we join it in. `unitPriceCents`
 * is the snapshot taken at purchase (never re-priced), while `name` / image /
 * options reflect the variant as it exists now — fine for a "what I bought"
 * label. Money is integer **cents**.
 */
export interface OrderLineView {
  variantId: number;
  productId: number;
  name: string;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  qty: number;
  unitPriceCents: number;
}

/**
 * An order in the user's history: its status + total plus the line items. The
 * total is the snapshot `total_cents` charged at purchase, so re-pricing the
 * catalog never alters a historical order.
 */
export interface OrderView {
  id: number;
  status: string;
  totalCents: number;
  createdAt: Date;
  items: OrderLineView[];
}

/**
 * The signed-in user's orders, newest first, each with its line items. Scoped by
 * `userId`, so a user only ever sees their own orders — including guest orders
 * just claimed onto the account (see `claimOrders`).
 *
 * Two queries, not N+1: one for the orders, one for all their items joined to
 * variant + product, then grouped in memory. A user's order history is small, so
 * the `inArray` fan-in is fine and far simpler than a single grouped query.
 */
export async function listOrders(userId: string): Promise<OrderView[]> {
  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt), desc(orders.id));

  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((o) => o.id);
  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      variantId: variants.id,
      productId: products.id,
      name: products.name,
      size: variants.size,
      colorName: variants.colorName,
      colorHex: variants.colorHex,
      imageUrl: variants.imageUrl,
      qty: orderItems.qty,
      unitPriceCents: orderItems.unitPriceCents,
    })
    .from(orderItems)
    .innerJoin(variants, eq(orderItems.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(orderItems.id);

  const itemsByOrder = new Map<number, OrderLineView[]>();
  for (const { orderId, ...line } of itemRows) {
    const lines = itemsByOrder.get(orderId);
    if (lines) lines.push(line);
    else itemsByOrder.set(orderId, [line]);
  }

  return orderRows.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
}
