// The cart — a pure reducer over device-local cart state, keyed by `variant_id`.
//
// Cart is client state (Context + useState over this reducer); it never talks to
// the server. Every line references a `variantId` (never a bare product) so cart,
// wishlist, and checkout share one code path. Each line snapshots the variant's
// display fields and `unitPriceCents` at add-time so the cart renders without a
// refetch; the *authoritative* price is recomputed server-side at checkout, so
// this snapshot is for display only. Money is integer cents throughout.

/** The product/variant snapshot needed to add (and later render) a cart line. */
export interface CartLineInput {
  variantId: number;
  productId: number;
  name: string;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  unitPriceCents: number;
  imageUrl: string | null;
}

/** A cart line: its snapshot plus the chosen quantity. */
export interface CartItem extends CartLineInput {
  qty: number;
}

export interface CartState {
  items: CartItem[];
}

export const emptyCart: CartState = { items: [] };

export type CartAction =
  | { type: "add"; line: CartLineInput; qty?: number }
  | { type: "setQty"; variantId: number; qty: number }
  | { type: "remove"; variantId: number }
  | { type: "clear" }
  | { type: "hydrate"; items: CartItem[] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const qty = action.qty ?? 1;
      const existing = state.items.find((i) => i.variantId === action.line.variantId);
      if (existing) {
        // Same variant already in the cart → bump its quantity, keep one line.
        return {
          items: state.items.map((i) =>
            i.variantId === action.line.variantId ? { ...i, qty: i.qty + qty } : i
          ),
        };
      }
      return { items: [...state.items, { ...action.line, qty }] };
    }
    case "setQty": {
      // A quantity of zero (or less, defensively) means the shopper emptied the
      // line — drop it rather than keep a 0-qty ghost.
      if (action.qty <= 0) {
        return { items: state.items.filter((i) => i.variantId !== action.variantId) };
      }
      return {
        items: state.items.map((i) =>
          i.variantId === action.variantId ? { ...i, qty: action.qty } : i
        ),
      };
    }
    case "remove":
      return { items: state.items.filter((i) => i.variantId !== action.variantId) };
    case "clear":
      return emptyCart;
    case "hydrate":
      return { items: action.items };
  }
}

/** A line's total in cents: snapshot unit price × quantity. */
export function lineTotalCents(item: CartItem): number {
  return item.unitPriceCents * item.qty;
}

/** The cart's order total in cents — the sum of every line total. */
export function orderTotalCents(state: CartState): number {
  return state.items.reduce((sum, item) => sum + lineTotalCents(item), 0);
}

/** Total number of items (sum of quantities) — drives the tab-bar badge. */
export function cartCount(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.qty, 0);
}
