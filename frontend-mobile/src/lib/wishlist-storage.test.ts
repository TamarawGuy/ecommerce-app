import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WishlistItem } from "./wishlist";
import { clearWishlist, loadWishlist, saveWishlist } from "./wishlist-storage";

// Mock the native AsyncStorage with an in-memory store so the persistence module
// can be exercised for real (serialize → store → read → parse) without a device.
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn(async (k: string) => void store.delete(k)),
  },
}));

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

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("wishlist persistence", () => {
  it("round-trips saved items back through load", async () => {
    const items = [
      item({ variantId: 1, size: "M", colorName: "Black", colorHex: "#000000" }),
      item({ variantId: 2, priceCents: 4999, inStock: false }),
    ];

    await saveWishlist(items);

    expect(await loadWishlist()).toEqual(items);
  });

  it("returns an empty list when nothing has been saved", async () => {
    expect(await loadWishlist()).toEqual([]);
  });

  it("clears the saved wishlist", async () => {
    await saveWishlist([item({ variantId: 1 })]);
    await clearWishlist();

    expect(await loadWishlist()).toEqual([]);
  });

  it("degrades to empty on a corrupt blob", async () => {
    store.set("vibe.wishlist.v1", "{not json");

    expect(await loadWishlist()).toEqual([]);
  });

  it("ignores a wishlist stored under a different schema version", async () => {
    store.set(
      "vibe.wishlist.v1",
      JSON.stringify({ v: 999, items: [item({ variantId: 1 })] })
    );

    expect(await loadWishlist()).toEqual([]);
  });
});
