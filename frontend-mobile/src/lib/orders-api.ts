// Thin client for the order-history API (`GET /orders`, auth-protected). The
// server claims any matching past guest orders before returning, so signing in
// is all it takes for a guest order to show up here.

import { apiFetch } from "./api";

/** A line on an order — the variant/product snapshot needed to render it. */
export interface OrderLine {
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

/** An order's lifecycle status (mirrors the backend `orders.status`). */
export type OrderStatus = "pending" | "paid" | "cancelled";

export interface Order {
  id: number;
  status: OrderStatus;
  totalCents: number;
  /** ISO timestamp, serialized from the server's `created_at`. */
  createdAt: string;
  items: OrderLine[];
}

/** Fetches the signed-in user's orders (newest first). */
export async function fetchOrders(token: string | null): Promise<Order[]> {
  return (await apiFetch<{ items: Order[] }>("/orders", undefined, token)).items;
}
