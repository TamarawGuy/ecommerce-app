import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { products, variants, wishlistItems } from "../db/schema.js";

/**
 * A wishlist entry enriched for display. The stored row is just
 * `(user_id, variant_id)`; the client needs the product/variant snapshot to
 * render a card and link to the product, so we join it in here (mirrors the
 * shape the device-local guest wishlist stores). `inStock` is derived from the
 * variant's current stock. Money is integer **cents**.
 */
export interface WishlistItemView {
  variantId: number;
  productId: number;
  name: string;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  priceCents: number;
  imageUrl: string | null;
  inStock: boolean;
}

/**
 * The user's wishlist, newest-first, joined to its variant and product for
 * display. A single query (no N+1): the join carries every field a card needs.
 */
export async function getWishlist(userId: string): Promise<WishlistItemView[]> {
  const rows = await db
    .select({
      variantId: variants.id,
      productId: products.id,
      name: products.name,
      size: variants.size,
      colorName: variants.colorName,
      colorHex: variants.colorHex,
      priceCents: variants.priceCents,
      imageUrl: variants.imageUrl,
      stock: variants.stock,
    })
    .from(wishlistItems)
    .innerJoin(variants, eq(wishlistItems.variantId, variants.id))
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.id));

  return rows.map(({ stock, ...r }) => ({ ...r, inStock: stock > 0 }));
}

/**
 * Adds a variant to the user's wishlist. Idempotent: the unique
 * `(user_id, variant_id)` index turns a repeated add into a no-op rather than a
 * duplicate row.
 */
export async function addToWishlist(
  userId: string,
  variantId: number
): Promise<void> {
  await db
    .insert(wishlistItems)
    .values({ userId, variantId })
    .onConflictDoNothing();
}

/** Removes a variant from the user's wishlist (a no-op if it isn't saved). */
export async function removeFromWishlist(
  userId: string,
  variantId: number
): Promise<void> {
  await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.variantId, variantId)
      )
    );
}

/**
 * Union-merges a guest's local wishlist into the user's server wishlist on first
 * login, returning the resulting list. De-duping is automatic: the bulk insert
 * is `onConflictDoNothing`, so variants the user had already saved are left
 * untouched and never duplicated.
 *
 * We first intersect the incoming ids with variants that actually exist — a
 * guest may have saved a variant the catalog has since dropped, and an unfiltered
 * insert would hit the foreign key and fail the whole merge. Filtering keeps the
 * merge resilient: stale guest entries are silently discarded, the rest land.
 */
export async function mergeWishlist(
  userId: string,
  variantIds: number[]
): Promise<WishlistItemView[]> {
  const unique = [...new Set(variantIds)].filter(
    (id) => Number.isInteger(id) && id > 0
  );

  if (unique.length > 0) {
    const existing = await db
      .select({ id: variants.id })
      .from(variants)
      .where(inArray(variants.id, unique));

    if (existing.length > 0) {
      await db
        .insert(wishlistItems)
        .values(existing.map(({ id }) => ({ userId, variantId: id })))
        .onConflictDoNothing();
    }
  }

  return getWishlist(userId);
}
