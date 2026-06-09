import { describe, expect, it } from "vitest";

import { resolveVariant, type Variant } from "./variant-resolver.js";

/** Build a variant with sensible defaults so tests only specify what matters. */
function variant(partial: Partial<Variant> & { id: number }): Variant {
  return {
    size: null,
    colorName: null,
    colorHex: null,
    priceCents: 1000,
    stock: 5,
    imageUrl: null,
    ...partial,
  };
}

describe("resolveVariant — single-variant collapse", () => {
  // A one-size item (cap, sunglasses) is a product with exactly one variant.
  const only = variant({ id: 1, priceCents: 2499, stock: 3 });

  it("collapses to the lone variant with no picker dimensions", () => {
    const r = resolveVariant([only]);

    expect(r.isSingleVariant).toBe(true);
    expect(r.hasSize).toBe(false);
    expect(r.hasColor).toBe(false);
    expect(r.sizes).toEqual([]);
    expect(r.colors).toEqual([]);
  });

  it("auto-resolves to that variant regardless of (ignored) selection", () => {
    const r = resolveVariant([only], { size: "XL", colorName: "Red" });

    expect(r.variant?.id).toBe(1);
    expect(r.inStock).toBe(true);
  });

  it("still resolves the lone variant when it is out of stock, but reports inStock=false", () => {
    const r = resolveVariant([variant({ id: 9, stock: 0 })]);

    expect(r.isSingleVariant).toBe(true);
    expect(r.variant?.id).toBe(9);
    expect(r.inStock).toBe(false);
  });
});

describe("resolveVariant — multi-variant resolution", () => {
  // A t-shirt in size × color. (S/M) × (Black/White) = 4 variants.
  const tshirt: Variant[] = [
    variant({ id: 1, size: "S", colorName: "Black", colorHex: "#000000" }),
    variant({ id: 2, size: "M", colorName: "Black", colorHex: "#000000" }),
    variant({ id: 3, size: "S", colorName: "White", colorHex: "#ffffff" }),
    variant({ id: 4, size: "M", colorName: "White", colorHex: "#ffffff" }),
  ];

  it("exposes both dimensions and is not single-variant", () => {
    const r = resolveVariant(tshirt);

    expect(r.isSingleVariant).toBe(false);
    expect(r.hasSize).toBe(true);
    expect(r.hasColor).toBe(true);
    expect(r.sizes.map((s) => s.value)).toEqual(["S", "M"]);
    expect(r.colors.map((c) => c.name)).toEqual(["Black", "White"]);
    expect(r.colors[0]).toMatchObject({ name: "Black", hex: "#000000" });
  });

  it("leaves the variant unresolved until every dimension is chosen", () => {
    expect(resolveVariant(tshirt, {}).variant).toBeNull();
    expect(resolveVariant(tshirt, { size: "S" }).variant).toBeNull();
    expect(resolveVariant(tshirt, { colorName: "Black" }).variant).toBeNull();
  });

  it("resolves a full selection to the matching variant id", () => {
    expect(resolveVariant(tshirt, { size: "M", colorName: "White" }).variant?.id).toBe(4);
    expect(resolveVariant(tshirt, { size: "S", colorName: "Black" }).variant?.id).toBe(1);
  });

  it("derives product-level in-stock from any in-stock variant", () => {
    expect(resolveVariant(tshirt).inStock).toBe(true);
  });
});

describe("resolveVariant — unavailable / out-of-stock combinations", () => {
  // M/White is out of stock; S/White doesn't exist at all.
  const tshirt: Variant[] = [
    variant({ id: 1, size: "S", colorName: "Black", stock: 4 }),
    variant({ id: 2, size: "M", colorName: "Black", stock: 4 }),
    variant({ id: 3, size: "M", colorName: "White", stock: 0 }),
  ];

  it("marks a size unavailable when, given the chosen color, no in-stock variant exists", () => {
    // White only exists in M, and that is out of stock → no available size for White.
    const r = resolveVariant(tshirt, { colorName: "White" });
    const byValue = Object.fromEntries(r.sizes.map((s) => [s.value, s.available]));

    expect(byValue["M"]).toBe(false);
    expect(byValue["S"]).toBe(false); // S/White doesn't exist
  });

  it("marks a color available only when an in-stock variant matches the chosen size", () => {
    // For size M: Black is in stock (available), White is OOS (unavailable).
    const r = resolveVariant(tshirt, { size: "M" });
    const byName = Object.fromEntries(r.colors.map((c) => [c.name, c.available]));

    expect(byName["Black"]).toBe(true);
    expect(byName["White"]).toBe(false);
  });

  it("resolves to an out-of-stock variant but exposes its zero stock", () => {
    const r = resolveVariant(tshirt, { size: "M", colorName: "White" });

    expect(r.variant?.id).toBe(3);
    expect(r.variant?.stock).toBe(0);
  });

  it("returns a null variant for a combination that does not exist", () => {
    expect(resolveVariant(tshirt, { size: "S", colorName: "White" }).variant).toBeNull();
  });
});

describe("resolveVariant — single dimension (color only)", () => {
  // A cap offered in three colors, no size. Green is sold out.
  const caps: Variant[] = [
    variant({ id: 1, colorName: "Black", colorHex: "#000", stock: 2 }),
    variant({ id: 2, colorName: "Navy", colorHex: "#001f3f", stock: 1 }),
    variant({ id: 3, colorName: "Green", colorHex: "#2ecc40", stock: 0 }),
  ];

  it("shows only the color dimension and resolves on color alone", () => {
    const r = resolveVariant(caps, { colorName: "Navy" });

    expect(r.hasSize).toBe(false);
    expect(r.hasColor).toBe(true);
    expect(r.sizes).toEqual([]);
    expect(r.variant?.id).toBe(2);
  });

  it("flags the sold-out color as unavailable", () => {
    const byName = Object.fromEntries(
      resolveVariant(caps).colors.map((c) => [c.name, c.available])
    );

    expect(byName["Green"]).toBe(false);
    expect(byName["Black"]).toBe(true);
  });
});
