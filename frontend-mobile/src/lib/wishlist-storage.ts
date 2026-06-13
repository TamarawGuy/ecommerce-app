// Guest wishlist persistence — the device-local wishlist survives app restarts
// via AsyncStorage so a guest's saved items aren't lost (and are still around to
// merge into their account on first login). Mirrors the cart's versioned
// envelope: any read failure or stale schema degrades to "empty" rather than
// crashing, since the wishlist is a convenience, never load-bearing.

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { WishlistItem } from "./wishlist";

const STORAGE_KEY = "vibe.wishlist.v1";
const SCHEMA_VERSION = 1;

interface WishlistEnvelope {
  v: number;
  items: WishlistItem[];
}

/** Persists the guest wishlist's items. Overwrites any previously saved list. */
export async function saveWishlist(items: WishlistItem[]): Promise<void> {
  const envelope: WishlistEnvelope = { v: SCHEMA_VERSION, items };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

/**
 * Rehydrates the saved guest wishlist. Returns an empty list when nothing is
 * stored, the schema version differs, or the blob can't be parsed.
 */
export async function loadWishlist(): Promise<WishlistItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WishlistEnvelope;
    if (parsed.v !== SCHEMA_VERSION || !Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    return [];
  }
}

/** Clears the guest wishlist (called once it has been merged into an account). */
export async function clearWishlist(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
