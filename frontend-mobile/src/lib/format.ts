// Money is integer cents everywhere (single currency, USD). Format only at the edge.

/** Formats integer cents as a USD price string, e.g. `2499` → `"$24.99"`. */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
