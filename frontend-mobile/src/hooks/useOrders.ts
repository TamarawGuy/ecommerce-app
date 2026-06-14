import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";

import { fetchOrders, type Order } from "@/src/lib/orders-api";

const ordersKey = (userId: string | null | undefined) => ["orders", userId];

/**
 * Server state for the signed-in user's order history. Gated on the Clerk
 * session (disabled while signed out), so it never blocks guest browsing. The
 * fetch also triggers server-side claim-on-read, so a guest order placed before
 * sign-up appears on the first load after signing in.
 */
export function useOrders() {
  const { getToken, isSignedIn, userId } = useAuth();

  const query = useQuery({
    queryKey: ordersKey(userId),
    enabled: Boolean(isSignedIn),
    queryFn: async () => fetchOrders(await getToken()),
  });

  return {
    orders: query.data ?? ([] as Order[]),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
