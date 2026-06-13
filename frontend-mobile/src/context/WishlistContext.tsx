// Wishlist client state. One API (`useWishlist`) over two backends:
//
//   • Guest  → a device-local list (Context over `WishlistItem[]`, persisted to
//     AsyncStorage), so saving works with no account, like the cart.
//   • Signed-in → the server wishlist via TanStack Query, with optimistic
//     toggles so the heart flips instantly.
//
// On first login the local guest list is union-merged into the account
// (de-duped by `variant_id`, server-side) and then cleared, so a shopper never
// loses what they saved as a guest. Consumers (`useWishlist`) never branch on
// auth state — `items` / `isWishlisted` / `toggle` resolve to whichever backend
// is active.

import { useAuth } from "@clerk/clerk-expo";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  addWishlistItem,
  fetchWishlist,
  mergeWishlist,
  removeWishlistItem,
} from "@/src/lib/wishlist-api";
import {
  clearWishlist,
  loadWishlist,
  saveWishlist,
} from "@/src/lib/wishlist-storage";
import {
  isWishlisted as itemsContain,
  toggleWishlist,
  type WishlistItem,
} from "@/src/lib/wishlist";

interface WishlistContextValue {
  items: WishlistItem[];
  /** Whether the given variant is wishlisted (across whichever backend is active). */
  isWishlisted: (variantId: number) => boolean;
  /** Add the variant if absent, remove it if present. Optimistic when signed in. */
  toggle: (item: WishlistItem) => void;
  /** False until the active source has produced its first result (guards the UI). */
  isReady: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/** TanStack Query key for the signed-in user's server wishlist. */
function wishlistKey(userId: string | null | undefined) {
  return ["wishlist", userId] as const;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const queryClient = useQueryClient();

  // --- Guest (device-local) wishlist ---------------------------------------
  const [localItems, setLocalItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate the saved guest list once on launch. Until it lands we hold off
  // persisting so an initial empty render can't clobber the saved list.
  useEffect(() => {
    let active = true;
    loadWishlist().then((items) => {
      if (!active) return;
      setLocalItems(items);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist guest changes after hydration. Skip the first post-hydration run so
  // loading the list doesn't immediately rewrite identical data.
  const skipNextSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    void saveWishlist(localItems);
  }, [hydrated, localItems]);

  // --- Signed-in (server) wishlist -----------------------------------------
  const wishlistQuery = useQuery({
    queryKey: wishlistKey(userId),
    enabled: Boolean(isLoaded && isSignedIn),
    queryFn: async () => fetchWishlist(await getToken()),
  });

  // Optimistic toggle: flip the cached list immediately, roll back on error,
  // and reconcile with the server on settle. `add` is decided by the caller
  // (`toggle`) from the current state so the mutation has no ordering ambiguity.
  const toggleMutation = useMutation({
    mutationFn: async ({ item, add }: { item: WishlistItem; add: boolean }) => {
      const token = await getToken();
      if (add) await addWishlistItem(item.variantId, token);
      else await removeWishlistItem(item.variantId, token);
    },
    onMutate: async ({ item, add }) => {
      const key = wishlistKey(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<WishlistItem[]>(key) ?? [];
      const next = add
        ? itemsContain(prev, item.variantId)
          ? prev
          : [...prev, item]
        : prev.filter((i) => i.variantId !== item.variantId);
      queryClient.setQueryData<WishlistItem[]>(key, next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(wishlistKey(userId), ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: wishlistKey(userId) });
    },
  });

  // --- Merge-on-login -------------------------------------------------------
  // The latest guest list, read inside the (intentionally auth-only) effect
  // without making it a dependency.
  const localItemsRef = useRef(localItems);
  localItemsRef.current = localItems;
  // The user we've already merged for, so the union runs exactly once per login.
  const mergedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !hydrated) return;
    if (mergedForUser.current === userId) return;
    mergedForUser.current = userId;

    const guestItems = localItemsRef.current;
    let active = true;
    void (async () => {
      try {
        const token = await getToken();
        if (guestItems.length > 0) {
          const merged = await mergeWishlist(
            guestItems.map((i) => i.variantId),
            token
          );
          if (!active) return;
          // Seed the cache with the merged result, then drop the now-consumed
          // guest list so it can't re-merge or show stale items.
          queryClient.setQueryData(wishlistKey(userId), merged);
          setLocalItems([]);
          await clearWishlist();
        } else {
          void queryClient.invalidateQueries({ queryKey: wishlistKey(userId) });
        }
      } catch {
        // Best-effort: keep the guest list and let the next launch retry.
        mergedForUser.current = null;
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, userId, hydrated]);

  // --- Unified surface ------------------------------------------------------
  const signedIn = Boolean(isLoaded && isSignedIn);
  const items = signedIn ? wishlistQuery.data ?? [] : localItems;
  const isReady = !isLoaded
    ? false
    : signedIn
      ? !wishlistQuery.isPending
      : hydrated;

  const value: WishlistContextValue = {
    items,
    isReady,
    isWishlisted: (variantId) => itemsContain(items, variantId),
    toggle: (item) => {
      if (signedIn) {
        toggleMutation.mutate({
          item,
          add: !itemsContain(items, item.variantId),
        });
      } else {
        setLocalItems((prev) => toggleWishlist(prev, item));
      }
    },
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

/** Access the wishlist. Throws if used outside <WishlistProvider> (a wiring bug). */
export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
