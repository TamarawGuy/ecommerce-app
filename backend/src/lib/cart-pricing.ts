// Cart pricing — the authoritative, server-side order total.
//
// Security invariant: the **server is the sole authority on price**. The client
// sends only `{ variantId, qty }`; this module recomputes every line price from
// the catalog (`lookup`) and never reads a price off the incoming item. The
// signature deliberately has no price field, so a tampered client total is
// structurally impossible to honor. Money is integer **cents** throughout.
//
// Pure and dependency-free (no DB, no env), so it unit-tests fast: the caller
// (`checkout.service`) loads the variants and hands in the `lookup`.

/** What the client may send per line — an id and a quantity, never a price. */
export interface CartLine {
  variantId: number;
  qty: number;
}

/** A priced line: the quantity plus the catalog price snapshotted at checkout. */
export interface PricedLine {
  variantId: number;
  qty: number;
  unitPriceCents: number;
}

/** The priced cart: every line plus the authoritative order total. */
export interface PricedCart {
  lineItems: PricedLine[];
  totalCents: number;
}

/** Variant id → its current catalog price, as loaded from the DB by the caller. */
export type PriceLookup = Map<number, { priceCents: number }>;

/** Thrown for any malformed cart (empty, unknown variant, bad qty, duplicate). */
export class CartPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartPricingError";
  }
}

/**
 * Recomputes the authoritative total for a cart. Each line's price comes from
 * `lookup` (the catalog), so the client cannot influence what it pays.
 *
 * Rejects a malformed cart rather than silently coercing it — a checkout that
 * can't be priced correctly must not proceed to payment:
 * - empty cart (nothing to charge for);
 * - a variant absent from `lookup` (unknown/deleted product);
 * - a quantity that isn't a positive integer;
 * - the same variant listed twice (a well-formed cart keys by variant, so a
 *   duplicate signals a client bug we won't guess how to merge).
 */
export function priceCart(items: CartLine[], lookup: PriceLookup): PricedCart {
  if (items.length === 0) {
    throw new CartPricingError("Cart is empty");
  }

  const seen = new Set<number>();
  const lineItems: PricedLine[] = items.map((item) => {
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new CartPricingError(
        `Invalid quantity ${item.qty} for variant ${item.variantId}`
      );
    }
    if (seen.has(item.variantId)) {
      throw new CartPricingError(
        `Variant ${item.variantId} appears more than once`
      );
    }
    seen.add(item.variantId);

    const variant = lookup.get(item.variantId);
    if (!variant) {
      throw new CartPricingError(`Unknown variant ${item.variantId}`);
    }

    return {
      variantId: item.variantId,
      qty: item.qty,
      unitPriceCents: variant.priceCents,
    };
  });

  const totalCents = lineItems.reduce(
    (sum, line) => sum + line.unitPriceCents * line.qty,
    0
  );

  return { lineItems, totalCents };
}
