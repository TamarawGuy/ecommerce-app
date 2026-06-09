// Shared variant-resolver module (FE/BE). Pure functions — no SQL, no I/O.
//
// Every product is sold through one or more variants (size and/or color); a
// one-size item (cap, sunglasses) is simply a product with a single variant.
// This module turns a product's variants plus an in-progress `{size, color}`
// selection into everything the detail screen needs: the option dimensions to
// render, which options are still attainable (in stock given the other choice),
// the fully-resolved variant once a complete selection is made, and whether the
// product is in stock at all. It also collapses a single-variant product so no
// picker is shown. This is the canonical, unit-tested source; the frontend keeps
// a verbatim copy (no monorepo tooling yet) — keep the two in sync.

/** A product variant as stored/returned by the API. */
export interface Variant {
  id: number;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
}

/** An in-progress selection. Either dimension may be unset (null/undefined). */
export interface Selection {
  size?: string | null;
  colorName?: string | null;
}

/** A size choice and whether it is attainable given the current color. */
export interface SizeOption {
  value: string;
  available: boolean;
}

/** A color swatch and whether it is attainable given the current size. */
export interface ColorOption {
  name: string;
  hex: string | null;
  available: boolean;
}

/** The fully-derived state for rendering a product and its variant picker. */
export interface ResolvedProduct {
  /** True when the product has exactly one variant (no picker shown). */
  isSingleVariant: boolean;
  /** Whether the product varies by size / color (a dimension to render). */
  hasSize: boolean;
  hasColor: boolean;
  /** Distinct size / color options in first-appearance order. */
  sizes: SizeOption[];
  colors: ColorOption[];
  /** The effective selection (forced to the lone variant when collapsed). */
  selectedSize: string | null;
  selectedColorName: string | null;
  /**
   * The variant matching a complete selection, or `null` while the selection is
   * incomplete or names a combination that doesn't exist. A resolved variant may
   * still be out of stock — check `variant.stock`.
   */
  variant: Variant | null;
  /** Product-level: at least one variant has stock. Drives the OOS marker. */
  inStock: boolean;
}

/**
 * Derives the renderable state for a product's variants under a `selection`.
 *
 * Availability is computed per dimension against the *other* current choice: a
 * size is `available` when some variant has that size, matches the selected
 * color (if any), and has stock; colors are symmetric. The variant resolves only
 * once every present dimension is chosen (a single-variant product needs no
 * choice and collapses to its lone variant).
 */
export function resolveVariant(
  variants: Variant[],
  selection: Selection = {}
): ResolvedProduct {
  const hasSize = variants.some((v) => v.size !== null);
  const hasColor = variants.some((v) => v.colorName !== null);
  const isSingleVariant = variants.length === 1;
  const inStock = variants.some((v) => v.stock > 0);

  // Collapse: a single-variant product is fully determined, so its lone variant's
  // options stand in for any (irrelevant) selection.
  let selectedSize = selection.size ?? null;
  let selectedColorName = selection.colorName ?? null;
  if (isSingleVariant) {
    const only = variants[0]!;
    selectedSize = only.size;
    selectedColorName = only.colorName;
  }

  // Distinct option values, preserving first-appearance order for stable rendering.
  const sizeValues: string[] = [];
  const colorByName = new Map<string, string | null>();
  for (const v of variants) {
    if (v.size !== null && !sizeValues.includes(v.size)) sizeValues.push(v.size);
    if (v.colorName !== null && !colorByName.has(v.colorName)) {
      colorByName.set(v.colorName, v.colorHex);
    }
  }

  const sizes: SizeOption[] = sizeValues.map((value) => ({
    value,
    available: variants.some(
      (v) =>
        v.size === value &&
        (selectedColorName === null || v.colorName === selectedColorName) &&
        v.stock > 0
    ),
  }));

  const colors: ColorOption[] = [...colorByName.entries()].map(([name, hex]) => ({
    name,
    hex,
    available: variants.some(
      (v) =>
        v.colorName === name &&
        (selectedSize === null || v.size === selectedSize) &&
        v.stock > 0
    ),
  }));

  // Resolve only when every dimension the product actually has is chosen.
  const sizeSatisfied = !hasSize || selectedSize !== null;
  const colorSatisfied = !hasColor || selectedColorName !== null;
  const variant =
    sizeSatisfied && colorSatisfied
      ? variants.find(
          (v) => v.size === selectedSize && v.colorName === selectedColorName
        ) ?? null
      : null;

  return {
    isSingleVariant,
    hasSize,
    hasColor,
    sizes,
    colors,
    selectedSize,
    selectedColorName,
    variant,
    inStock,
  };
}
