import { describe, expect, it } from "vitest";

import {
  type CartLineInput,
  cartCount,
  cartReducer,
  emptyCart,
  lineTotalCents,
  orderTotalCents,
} from "./cart";

/** A cart line's product/variant snapshot, with sensible defaults per test. */
function line(partial: Partial<CartLineInput> & { variantId: number }): CartLineInput {
  return {
    productId: 100,
    name: "Test Tee",
    size: null,
    colorName: null,
    colorHex: null,
    unitPriceCents: 1000,
    imageUrl: null,
    ...partial,
  };
}

describe("cartReducer — add", () => {
  it("adds a new variant as a line with quantity 1", () => {
    const state = cartReducer(emptyCart, { type: "add", line: line({ variantId: 1 }) });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ variantId: 1, qty: 1 });
  });

  it("adds with an explicit quantity", () => {
    const state = cartReducer(emptyCart, {
      type: "add",
      line: line({ variantId: 1 }),
      qty: 3,
    });

    expect(state.items[0]?.qty).toBe(3);
  });

  it("increments quantity (and keeps one line) when the same variant is added again", () => {
    const once = cartReducer(emptyCart, { type: "add", line: line({ variantId: 1 }) });
    const twice = cartReducer(once, { type: "add", line: line({ variantId: 1 }), qty: 2 });

    expect(twice.items).toHaveLength(1);
    expect(twice.items[0]?.qty).toBe(3);
  });

  it("keeps distinct variants as separate lines", () => {
    const a = cartReducer(emptyCart, { type: "add", line: line({ variantId: 1 }) });
    const b = cartReducer(a, { type: "add", line: line({ variantId: 2 }) });

    expect(b.items.map((i) => i.variantId)).toEqual([1, 2]);
  });
});

describe("cartReducer — setQty", () => {
  const seeded = cartReducer(emptyCart, { type: "add", line: line({ variantId: 1 }), qty: 2 });

  it("sets a line to the given quantity", () => {
    const state = cartReducer(seeded, { type: "setQty", variantId: 1, qty: 5 });

    expect(state.items[0]?.qty).toBe(5);
  });

  it("removes the line when quantity drops to zero", () => {
    const state = cartReducer(seeded, { type: "setQty", variantId: 1, qty: 0 });

    expect(state.items).toHaveLength(0);
  });

  it("removes the line for a negative quantity rather than storing it", () => {
    const state = cartReducer(seeded, { type: "setQty", variantId: 1, qty: -3 });

    expect(state.items).toHaveLength(0);
  });

  it("ignores an unknown variant", () => {
    const state = cartReducer(seeded, { type: "setQty", variantId: 999, qty: 4 });

    expect(state.items).toEqual(seeded.items);
  });
});

describe("cartReducer — remove & clear", () => {
  const two = cartReducer(
    cartReducer(emptyCart, { type: "add", line: line({ variantId: 1 }) }),
    { type: "add", line: line({ variantId: 2 }) }
  );

  it("removes only the named variant", () => {
    const state = cartReducer(two, { type: "remove", variantId: 1 });

    expect(state.items.map((i) => i.variantId)).toEqual([2]);
  });

  it("clear empties the cart", () => {
    const state = cartReducer(two, { type: "clear" });

    expect(state.items).toHaveLength(0);
  });
});

describe("cartReducer — hydrate", () => {
  it("replaces the whole cart with the rehydrated items", () => {
    const seeded = cartReducer(emptyCart, { type: "add", line: line({ variantId: 9 }) });
    const restored = [{ ...line({ variantId: 1, unitPriceCents: 500 }), qty: 4 }];

    const state = cartReducer(seeded, { type: "hydrate", items: restored });

    expect(state.items).toEqual(restored);
  });
});

describe("cart totals", () => {
  it("a line total is unit price × quantity", () => {
    const item = { ...line({ variantId: 1, unitPriceCents: 2499 }), qty: 3 };

    expect(lineTotalCents(item)).toBe(7497);
  });

  it("the order total sums every line", () => {
    let state = cartReducer(emptyCart, {
      type: "add",
      line: line({ variantId: 1, unitPriceCents: 2499 }),
      qty: 2,
    });
    state = cartReducer(state, {
      type: "add",
      line: line({ variantId: 2, unitPriceCents: 1000 }),
      qty: 1,
    });

    expect(orderTotalCents(state)).toBe(2499 * 2 + 1000);
  });

  it("an empty cart totals zero and counts zero", () => {
    expect(orderTotalCents(emptyCart)).toBe(0);
    expect(cartCount(emptyCart)).toBe(0);
  });

  it("the count is the sum of quantities, not the number of lines", () => {
    let state = cartReducer(emptyCart, { type: "add", line: line({ variantId: 1 }), qty: 2 });
    state = cartReducer(state, { type: "add", line: line({ variantId: 2 }), qty: 3 });

    expect(cartCount(state)).toBe(5);
  });
});
