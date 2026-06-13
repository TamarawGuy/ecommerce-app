// Thin client for the checkout API (`POST /checkout`). The client sends only
// `variantId` + qty per line — never prices; the server recomputes the
// authoritative total. Works for guests (no token) and signed-in users (token
// links the order to them). Returns the Stripe PaymentIntent client secret the
// mobile PaymentSheet needs.

import { apiFetch } from "./api";
import type { CheckoutFormValues } from "./checkout-schema";

/** A cart line reduced to what the server trusts: which variant, how many. */
export interface CheckoutLine {
  variantId: number;
  qty: number;
}

export interface CheckoutResult {
  orderId: number;
  clientSecret: string;
  totalCents: number;
}

/** Maps the form's optional/blank strings to the API's `string | null` fields. */
function toShippingAddress(form: CheckoutFormValues) {
  return {
    name: form.name,
    line1: form.line1,
    line2: form.line2?.trim() || null,
    city: form.city,
    state: form.state,
    postal: form.postal,
    country: form.country,
    phone: form.phone?.trim() || null,
  };
}

export async function createCheckout(
  items: CheckoutLine[],
  form: CheckoutFormValues,
  token: string | null
): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>(
    "/checkout",
    {
      method: "POST",
      body: JSON.stringify({
        items,
        email: form.email,
        shippingAddress: toShippingAddress(form),
      }),
    },
    token
  );
}
