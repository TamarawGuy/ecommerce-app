import { and, desc, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { addresses, type Address } from "../db/schema.js";

/**
 * The editable fields of an address. `id`, `userId`, `isDefault`, and timestamps
 * are managed by the service — the default flag is never set by writing this
 * shape directly; it moves only through `createAddress(..., makeDefault)`,
 * `setDefaultAddress`, and the auto-promotion in `deleteAddress`, so the "exactly
 * one default" invariant has a single owner.
 */
export interface AddressInput {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string | null;
}

/**
 * A user's addresses, default first, then newest. Scoped by `userId`, so a user
 * only ever sees their own rows.
 */
export async function listAddresses(userId: string): Promise<Address[]> {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.id));
}

/**
 * Creates an address. It becomes the default when the caller asks for it *or*
 * when it is the user's first address — there is always a sensible default to
 * pre-select at checkout. Promoting a new default unsets the previous one in the
 * same transaction (and the user's rows are locked first), so the partial unique
 * index never sees two defaults.
 */
export async function createAddress(
  userId: string,
  input: AddressInput,
  makeDefault: boolean
): Promise<Address> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .for("update");

    const isDefault = makeDefault || existing.length === 0;
    if (isDefault) await clearDefault(tx, userId);

    const [row] = await tx
      .insert(addresses)
      .values({ ...input, userId, isDefault })
      .returning();
    if (!row) throw new Error("createAddress: insert returned no row");
    return row;
  });
}

/**
 * Updates an address's fields (not its default flag — see `setDefaultAddress`).
 * Scoped by `userId`: a row owned by someone else is invisible here, so the
 * update simply matches nothing and returns null (the controller maps that to a
 * 404). Returns the updated row.
 */
export async function updateAddress(
  userId: string,
  id: number,
  input: AddressInput
): Promise<Address | null> {
  const [row] = await db
    .update(addresses)
    .set(input)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning();
  return row ?? null;
}

/**
 * Marks one address as the user's default, unsetting whichever was default
 * before — the whole point of the feature's "exactly one default" rule. Both
 * writes share a transaction with the user's rows locked, so the unset and set
 * can never interleave into two defaults. Returns null if the address isn't the
 * user's (→ 404).
 */
export async function setDefaultAddress(
  userId: string,
  id: number
): Promise<Address | null> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .for("update");
    if (!target) return null;

    await clearDefault(tx, userId);
    const [row] = await tx
      .update(addresses)
      .set({ isDefault: true })
      .where(eq(addresses.id, id))
      .returning();
    return row ?? null;
  });
}

/**
 * Deletes an address. If it was the default and the user still has others, the
 * newest survivor is promoted so the account keeps exactly one default. Scoped
 * by `userId`. Returns whether a row was actually deleted (false → 404).
 */
export async function deleteAddress(
  userId: string,
  id: number
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning({ wasDefault: addresses.isDefault });
    if (!deleted) return false;

    if (deleted.wasDefault) {
      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.id))
        .limit(1);
      if (next) {
        await tx
          .update(addresses)
          .set({ isDefault: true })
          .where(eq(addresses.id, next.id));
      }
    }
    return true;
  });
}

/** Clears the default flag on all of a user's addresses (within a transaction). */
function clearDefault(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string
): Promise<unknown> {
  return tx
    .update(addresses)
    .set({ isDefault: false })
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
}
