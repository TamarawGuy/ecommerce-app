// Zod is the single source of truth for the address form's shape and
// validation, consumed by react-hook-form via @hookform/resolvers. The server
// re-validates and is authoritative on what it persists; this is the fast
// client-side gate. `line2` and `phone` are optional — everything else is a
// required postal field.

import { z } from "zod";

const required = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

export const addressSchema = z.object({
  name: required("Full name"),
  line1: required("Address line 1"),
  line2: z.string().trim().optional(),
  city: required("City"),
  state: required("State / region"),
  postal: required("Postal code"),
  country: required("Country"),
  phone: z.string().trim().optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

/** Blank form, used when adding a new address. */
export const emptyAddress: AddressFormValues = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal: "",
  country: "",
  phone: "",
};
