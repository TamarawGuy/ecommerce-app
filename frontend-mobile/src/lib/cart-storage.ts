// Cart persistence — the device-local cart survives app restarts via
// AsyncStorage (the cart has no server copy). We store a versioned envelope so a
// future shape change can reject (rather than crash on) stale data, and treat any
// read failure as "empty cart" so a corrupted blob never blocks the app.

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CartItem } from "./cart";

const STORAGE_KEY = "vibe.cart.v1";
const SCHEMA_VERSION = 1;

interface CartEnvelope {
  v: number;
  items: CartItem[];
}

/** Persists the cart's items. Overwrites any previously saved cart. */
export async function saveCart(items: CartItem[]): Promise<void> {
  const envelope: CartEnvelope = { v: SCHEMA_VERSION, items };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

/**
 * Rehydrates the saved cart. Returns an empty list when nothing is stored, the
 * stored schema version differs, or the blob can't be parsed — the cart is a
 * convenience, never load-bearing, so a bad read degrades to "empty".
 */
export async function loadCart(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartEnvelope;
    if (parsed.v !== SCHEMA_VERSION || !Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    return [];
  }
}
