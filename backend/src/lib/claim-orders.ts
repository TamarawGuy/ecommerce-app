/**
 * The pure decision at the heart of guest-order claiming: *which* of a Clerk
 * user's email addresses are eligible to claim past guest orders.
 *
 * This is the security-critical rule — "only verified emails ever claim" — so it
 * lives apart from the database write (`services/claim-orders.service`) and is
 * unit-tested in isolation. The DB `UPDATE` that consumes the result is
 * straightforward; the part that must never regress is this filter.
 *
 * The shape mirrors the **Clerk Backend API** `User` (camelCase
 * `emailAddress` / `verification`), which is what `clerkClient.users.getUser`
 * returns — not the snake_case webhook payload. The webhook (a future second
 * call-site, on Render) would map its payload into this same shape before
 * calling, so the rule stays single-sourced.
 */
export interface ClerkEmailVerification {
  status: string;
}
export interface ClerkEmailAddress {
  id: string;
  emailAddress: string;
  verification: ClerkEmailVerification | null;
}
export interface ClerkUserEmails {
  emailAddresses: ClerkEmailAddress[];
}

/**
 * The user's claimable emails: every **verified** address, trimmed, lowercased,
 * and de-duplicated. Unverified (or unverifiable) addresses are dropped — an
 * attacker could otherwise add someone else's email unverified and claim their
 * orders. Lowercasing matches how order emails are stored (and the case-
 * insensitive `lower(email)` match the claim runs); de-duping keeps the
 * downstream `= ANY(...)` set tidy. Order is preserved (first occurrence wins).
 */
export function claimableEmails(user: ClerkUserEmails): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const addr of user.emailAddresses) {
    if (addr.verification?.status !== "verified") continue;
    const email = addr.emailAddress.trim().toLowerCase();
    if (email.length === 0 || seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }

  return result;
}
