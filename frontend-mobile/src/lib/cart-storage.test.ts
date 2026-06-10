import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartItem } from "./cart";
import { loadCart, saveCart } from "./cart-storage";

// Mock the native AsyncStorage with an in-memory store so the persistence module
// can be exercised for real (serialize → store → read → parse) without a device.
// `vi.hoisted` makes the store available to the (hoisted) mock factory.
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn(async (k: string) => void store.delete(k)),
  },
}));

function item(partial: Partial<CartItem> & { variantId: number }): CartItem {
  return {
    productId: 100,
    name: "Test Tee",
    size: null,
    colorName: null,
    colorHex: null,
    unitPriceCents: 1000,
    imageUrl: null,
    qty: 1,
    ...partial,
  };
}

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("cart persistence", () => {
  it("round-trips saved items back through load", async () => {
    const items = [
      item({ variantId: 1, qty: 2, size: "M", colorName: "Black", colorHex: "#000000" }),
      item({ variantId: 2, qty: 1, unitPriceCents: 4999 }),
    ];

    await saveCart(items);

    expect(await loadCart()).toEqual(items);
  });

  it("returns an empty cart when nothing has been saved", async () => {
    expect(await loadCart()).toEqual([]);
  });

  it("overwrites the previously saved cart", async () => {
    await saveCart([item({ variantId: 1 })]);
    await saveCart([item({ variantId: 2, qty: 4 })]);

    const loaded = await loadCart();
    expect(loaded.map((i) => i.variantId)).toEqual([2]);
  });

  it("degrades to empty on a corrupt blob", async () => {
    store.set("vibe.cart.v1", "{not json");

    expect(await loadCart()).toEqual([]);
  });

  it("ignores a cart stored under a different schema version", async () => {
    store.set("vibe.cart.v1", JSON.stringify({ v: 999, items: [item({ variantId: 1 })] }));

    expect(await loadCart()).toEqual([]);
  });
});
