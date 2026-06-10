// Cart client state. The cart is device-local (no server copy), so it lives in
// React Context over the pure `cartReducer` rather than in TanStack Query. It
// rehydrates from AsyncStorage on launch and re-persists whenever it changes.

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  type CartItem,
  type CartLineInput,
  cartCount,
  cartReducer,
  emptyCart,
  orderTotalCents,
} from "@/src/lib/cart";
import { loadCart, saveCart } from "@/src/lib/cart-storage";

interface CartContextValue {
  items: CartItem[];
  /** Sum of quantities — drives the tab-bar badge. */
  count: number;
  /** Order total in integer cents (display only; server re-prices at checkout). */
  totalCents: number;
  /** False until the saved cart has been read, so the UI can avoid flashing empty. */
  hydrated: boolean;
  addItem: (line: CartLineInput, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  removeItem: (variantId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, emptyCart);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate once on launch. Until this completes we hold off persisting so an
  // initial empty render can't clobber the saved cart.
  useEffect(() => {
    let active = true;
    loadCart().then((items) => {
      if (!active) return;
      if (items.length > 0) dispatch({ type: "hydrate", items });
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist on every change after hydration. We skip the first post-hydration run
  // so loading a cart doesn't immediately rewrite identical data.
  const skipNextSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    void saveCart(state.items);
  }, [hydrated, state.items]);

  const value: CartContextValue = {
    items: state.items,
    count: cartCount(state),
    totalCents: orderTotalCents(state),
    hydrated,
    addItem: (line, qty) => dispatch({ type: "add", line, qty }),
    setQty: (variantId, qty) => dispatch({ type: "setQty", variantId, qty }),
    removeItem: (variantId) => dispatch({ type: "remove", variantId }),
    clear: () => dispatch({ type: "clear" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Access the cart. Throws if used outside <CartProvider> (a wiring bug). */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
