// Thin client for the saved-addresses API (`/addresses`, all auth-protected).
// The server is authoritative on the "exactly one default" rule, so the client
// just sends fields and a default intent; create/set-default/delete all return
// or imply a fresh list that the query layer refetches.

import { apiFetch } from "./api";
import type { AddressFormValues } from "./address-schemas";

export interface Address {
  id: number;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

/** Maps a form's optional/blank strings to the API's `string | null` fields. */
function toBody(values: AddressFormValues) {
  return {
    name: values.name,
    line1: values.line1,
    line2: values.line2?.trim() || null,
    city: values.city,
    state: values.state,
    postal: values.postal,
    country: values.country,
    phone: values.phone?.trim() || null,
  };
}

/** Fetches the signed-in user's addresses (default first). */
export async function fetchAddresses(token: string | null): Promise<Address[]> {
  return (
    await apiFetch<{ items: Address[] }>("/addresses", undefined, token)
  ).items;
}

/** Creates an address; `makeDefault` also marks it the default. */
export async function createAddress(
  values: AddressFormValues,
  makeDefault: boolean,
  token: string | null
): Promise<Address> {
  return (
    await apiFetch<{ address: Address }>(
      "/addresses",
      {
        method: "POST",
        body: JSON.stringify({ ...toBody(values), isDefault: makeDefault }),
      },
      token
    )
  ).address;
}

/** Updates an address's fields (its default flag is managed separately). */
export async function updateAddress(
  id: number,
  values: AddressFormValues,
  token: string | null
): Promise<Address> {
  return (
    await apiFetch<{ address: Address }>(
      `/addresses/${id}`,
      { method: "PATCH", body: JSON.stringify(toBody(values)) },
      token
    )
  ).address;
}

/** Marks an address as the default, unsetting the previous one server-side. */
export async function setDefaultAddress(
  id: number,
  token: string | null
): Promise<void> {
  await apiFetch(`/addresses/${id}/default`, { method: "POST" }, token);
}

/** Deletes an address (the server promotes a survivor if it was default). */
export async function deleteAddress(
  id: number,
  token: string | null
): Promise<void> {
  await apiFetch(`/addresses/${id}`, { method: "DELETE" }, token);
}
