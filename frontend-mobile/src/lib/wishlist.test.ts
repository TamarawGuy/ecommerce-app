import { describe, expect, it } from "vitest";

import { isWishlisted, toggleWishlist, type WishlistItem } from "./wishlist";

/** A wishlist entry's snapshot, with sensible defaults per test. */
function item(partial: Partial<WishlistItem> & { variantId: number }): WishlistItem {
  return {
    productId: 100,
    name: "Test Tee",
    size: null,
    colorName: null,
    colorHex: null,
    priceCents: 1000,
    imageUrl: null,
    inStock: true,
    ...partial,
  };
}

describe("isWishlisted", () => {
  it("is true when the variant is present and false otherwise", () => {
    const items = [item({ variantId: 1 }), item({ variantId: 2 })];
    expect(isWishlisted(items, 1)).toBe(true);
    expect(isWishlisted(items, 3)).toBe(false);
  });
});

describe("toggleWishlist", () => {
  it("adds a variant that isn't present", () => {
    const next = toggleWishlist([], item({ variantId: 1 }));
    expect(next.map((i) => i.variantId)).toEqual([1]);
  });

  it("removes a variant that is already present", () => {
    const start = [item({ variantId: 1 }), item({ variantId: 2 })];
    const next = toggleWishlist(start, item({ variantId: 1 }));
    expect(next.map((i) => i.variantId)).toEqual([2]);
  });

  it("re-adding the same variant never duplicates it", () => {
    let items = toggleWishlist([], item({ variantId: 1 }));
    items = toggleWishlist(items, item({ variantId: 1 })); // remove
    items = toggleWishlist(items, item({ variantId: 1 })); // add again
    expect(items.map((i) => i.variantId)).toEqual([1]);
  });

  it("does not mutate the input array", () => {
    const start = [item({ variantId: 1 })];
    toggleWishlist(start, item({ variantId: 2 }));
    expect(start.map((i) => i.variantId)).toEqual([1]);
  });
});
