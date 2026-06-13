// Thin client for the server wishlist (`/wishlist`, all auth-protected). The
// server stores only `(user_id, variant_id)` and joins back the product/variant
// snapshot on read, so a fetched item already matches the {@link WishlistItem}
// shape the guest list uses — one render path for both.

import { apiFetch } from "./api";
import type { WishlistItem } from "./wishlist";

/** Fetches the signed-in user's wishlist (newest first). */
export async function fetchWishlist(
  token: string | null
): Promise<WishlistItem[]> {
  return (
    await apiFetch<{ items: WishlistItem[] }>("/wishlist", undefined, token)
  ).items;
}

/** Adds one variant. Idempotent server-side (unique index → no duplicate). */
export async function addWishlistItem(
  variantId: number,
  token: string | null
): Promise<void> {
  await apiFetch(
    "/wishlist",
    { method: "POST", body: JSON.stringify({ variantId }) },
    token
  );
}

/** Removes one variant (a no-op server-side if it isn't saved). */
export async function removeWishlistItem(
  variantId: number,
  token: string | null
): Promise<void> {
  await apiFetch(`/wishlist/${variantId}`, { method: "DELETE" }, token);
}

/**
 * Union-merges a guest's local variant ids into the account and returns the
 * resulting wishlist. De-duping and stale-variant filtering happen server-side.
 */
export async function mergeWishlist(
  variantIds: number[],
  token: string | null
): Promise<WishlistItem[]> {
  return (
    await apiFetch<{ items: WishlistItem[] }>(
      "/wishlist/merge",
      { method: "POST", body: JSON.stringify({ variantIds }) },
      token
    )
  ).items;
}
