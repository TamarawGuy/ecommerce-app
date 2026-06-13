// The wishlist — pure types and helpers shared by the guest (device-local) and
// signed-in (server-synced) paths.
//
// Like the cart, every entry references a `variantId` (never a bare product), so
// cart, wishlist, and checkout share one code path. Each entry carries the
// product/variant snapshot needed to render a card and link to the product, so
// the guest list renders with no network and an optimistic add shows instantly
// before the server round-trip. The wishlist is a *set* keyed by `variantId`:
// adding a variant already present is a no-op (the server enforces the same via
// a unique index), so toggling is the only mutation. Money is integer cents.

/** A wishlisted variant plus the snapshot needed to render and link to it. */
export interface WishlistItem {
  variantId: number;
  productId: number;
  name: string;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  priceCents: number;
  imageUrl: string | null;
  /** Whether the variant had stock when saved/fetched — drives the OOS marker. */
  inStock: boolean;
}

/** Whether `variantId` is in the list. */
export function isWishlisted(
  items: WishlistItem[],
  variantId: number
): boolean {
  return items.some((i) => i.variantId === variantId);
}

/**
 * Toggles a variant's membership: removes it if present, otherwise appends it.
 * The set is keyed by `variantId`, so re-adding never duplicates. Returns a new
 * array (the input is never mutated).
 */
export function toggleWishlist(
  items: WishlistItem[],
  item: WishlistItem
): WishlistItem[] {
  return isWishlisted(items, item.variantId)
    ? items.filter((i) => i.variantId !== item.variantId)
    : [...items, item];
}
