// The checkout form's shape — the saved-address fields (reused verbatim from
// `address-schemas`) plus the buyer's email. Guests have no account, so email is
// captured here; signed-in users get it prefilled. Zod is the single source of
// truth, consumed by react-hook-form; the server re-validates and is
// authoritative on what it persists.

import { z } from "zod";

import { addressSchema, emptyAddress } from "./address-schemas";

export const checkoutSchema = addressSchema.extend({
  email: z.string().trim().email("Enter a valid email"),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/** Blank checkout form (guest with no prefill). */
export const emptyCheckout: CheckoutFormValues = { ...emptyAddress, email: "" };
