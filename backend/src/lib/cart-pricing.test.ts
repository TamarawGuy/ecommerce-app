import { describe, expect, it } from "vitest";

import {
  CartPricingError,
  priceCart,
  type PriceLookup,
} from "./cart-pricing.js";

/** A price lookup from `[variantId, priceCents]` pairs, as the service builds. */
function lookup(entries: [number, number][]): PriceLookup {
  return new Map(entries.map(([id, priceCents]) => [id, { priceCents }]));
}

describe("priceCart", () => {
  it("prices a single line from the catalog (price × qty)", () => {
    const result = priceCart([{ variantId: 1, qty: 3 }], lookup([[1, 500]]));

    expect(result.lineItems).toEqual([
      { variantId: 1, qty: 3, unitPriceCents: 500 },
    ]);
    expect(result.totalCents).toBe(1500);
  });

  it("sums multiple lines into the order total", () => {
    const result = priceCart(
      [
        { variantId: 1, qty: 2 },
        { variantId: 2, qty: 1 },
      ],
      lookup([
        [1, 500],
        [2, 1299],
      ])
    );

    expect(result.totalCents).toBe(2 * 500 + 1299);
    expect(result.lineItems).toEqual([
      { variantId: 1, qty: 2, unitPriceCents: 500 },
      { variantId: 2, qty: 1, unitPriceCents: 1299 },
    ]);
  });

  it("ignores any price the client tries to send — only the catalog is trusted", () => {
    // The line carries a bogus `unitPriceCents`; the signature has no price
    // input, so it is structurally discarded and the catalog price wins.
    const malicious = [
      { variantId: 1, qty: 1, unitPriceCents: 1 },
    ] as unknown as { variantId: number; qty: number }[];

    const result = priceCart(malicious, lookup([[1, 9999]]));

    expect(result.totalCents).toBe(9999);
    expect(result.lineItems[0]!.unitPriceCents).toBe(9999);
  });

  it("rejects an empty cart", () => {
    expect(() => priceCart([], lookup([[1, 500]]))).toThrow(CartPricingError);
  });

  it("rejects a variant missing from the catalog", () => {
    expect(() =>
      priceCart([{ variantId: 99, qty: 1 }], lookup([[1, 500]]))
    ).toThrow(CartPricingError);
  });

  it("rejects a non-positive quantity", () => {
    expect(() =>
      priceCart([{ variantId: 1, qty: 0 }], lookup([[1, 500]]))
    ).toThrow(CartPricingError);
    expect(() =>
      priceCart([{ variantId: 1, qty: -2 }], lookup([[1, 500]]))
    ).toThrow(CartPricingError);
  });

  it("rejects a non-integer quantity", () => {
    expect(() =>
      priceCart([{ variantId: 1, qty: 1.5 }], lookup([[1, 500]]))
    ).toThrow(CartPricingError);
  });

  it("rejects the same variant appearing twice (a malformed cart)", () => {
    expect(() =>
      priceCart(
        [
          { variantId: 1, qty: 1 },
          { variantId: 1, qty: 2 },
        ],
        lookup([[1, 500]])
      )
    ).toThrow(CartPricingError);
  });
});
