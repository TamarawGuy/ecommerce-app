import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";

import {
  createCheckout,
  type CheckoutLine,
  type CheckoutResult,
} from "@/src/lib/checkout-api";
import type { CheckoutFormValues } from "@/src/lib/checkout-schema";

/**
 * Starts a checkout on the server (prices the cart, creates a pending order +
 * PaymentIntent) and returns the client secret for the PaymentSheet. A one-shot
 * mutation rather than a query — it has side effects and is driven by the "Pay"
 * tap. Passes the Clerk token when signed in (links the order to the user) and
 * omits it for guests, so checkout never blocks on auth.
 */
export function useCheckout() {
  const { getToken } = useAuth();

  return useMutation<
    CheckoutResult,
    Error,
    { items: CheckoutLine[]; form: CheckoutFormValues }
  >({
    mutationFn: async ({ items, form }) =>
      createCheckout(items, form, await getToken()),
  });
}
