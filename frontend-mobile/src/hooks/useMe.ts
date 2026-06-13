import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/src/lib/api";

/** The backend's view of the signed-in user (synced from the Clerk webhook). */
export interface MeResponse {
  userId: string;
  /** False until the `user.created` webhook has populated the row. */
  synced: boolean;
  user: { id: string; email: string; name: string | null } | null;
}

/**
 * Fetches `GET /me` with the Clerk session JWT attached. This is the end-to-end
 * proof that the backend verifies the token and derives the userId — and it
 * surfaces whether the webhook has synced this user yet. Disabled (no request)
 * while signed out, so it never blocks guest browsing.
 */
export function useMe() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: ["me", userId],
    enabled: Boolean(isSignedIn),
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<MeResponse>("/me", undefined, token);
    },
  });
}
