import { useAuth } from "@clerk/clerk-expo";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
  type Address,
} from "@/src/lib/addresses-api";
import type { AddressFormValues } from "@/src/lib/address-schemas";

const addressesKey = (userId: string | null | undefined) => [
  "addresses",
  userId,
];

/**
 * Server state for the signed-in user's saved addresses. Reads are gated on the
 * Clerk session (disabled while signed out, so this never blocks guest
 * browsing). Mutations are kept simple — they invalidate the list on settle and
 * let the server's "exactly one default" rule drive the refetched result —
 * rather than reproducing that invariant optimistically on the client.
 */
export function useAddresses() {
  const { getToken, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const key = addressesKey(userId);

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(isSignedIn),
    queryFn: async () => fetchAddresses(await getToken()),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: async (vars: {
      values: AddressFormValues;
      makeDefault: boolean;
    }) => createAddress(vars.values, vars.makeDefault, await getToken()),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (vars: { id: number; values: AddressFormValues }) =>
      updateAddress(vars.id, vars.values, await getToken()),
    onSuccess: invalidate,
  });

  const makeDefault = useMutation({
    mutationFn: async (id: number) =>
      setDefaultAddress(id, await getToken()),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => deleteAddress(id, await getToken()),
    onSuccess: invalidate,
  });

  return {
    addresses: query.data ?? ([] as Address[]),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    create,
    update,
    makeDefault,
    remove,
  };
}
