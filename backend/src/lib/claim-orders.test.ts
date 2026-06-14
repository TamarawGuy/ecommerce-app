import { describe, expect, it } from "vitest";

import {
  claimableEmails,
  type ClerkUserEmails,
} from "./claim-orders.js";

/** Builds a minimal Clerk-user shape with the email/verification fields we read. */
function user(
  emails: { email: string; status: string | null }[]
): ClerkUserEmails {
  return {
    emailAddresses: emails.map((e, i) => ({
      id: `idn_${i}`,
      emailAddress: e.email,
      verification: e.status === null ? null : { status: e.status },
    })),
  };
}

describe("claimableEmails", () => {
  it("returns a single verified email, lowercased", () => {
    expect(
      claimableEmails(user([{ email: "Buyer@Example.com", status: "verified" }]))
    ).toEqual(["buyer@example.com"]);
  });

  it("includes every verified email (multiple addresses each claim)", () => {
    expect(
      claimableEmails(
        user([
          { email: "a@example.com", status: "verified" },
          { email: "b@example.com", status: "verified" },
        ])
      )
    ).toEqual(["a@example.com", "b@example.com"]);
  });

  it("drops unverified emails — only verified ones ever claim", () => {
    expect(
      claimableEmails(
        user([
          { email: "verified@example.com", status: "verified" },
          { email: "unverified@example.com", status: "unverified" },
        ])
      )
    ).toEqual(["verified@example.com"]);
  });

  it("drops emails with a null or missing verification", () => {
    expect(
      claimableEmails(
        user([
          { email: "ok@example.com", status: "verified" },
          { email: "none@example.com", status: null },
        ])
      )
    ).toEqual(["ok@example.com"]);
  });

  it("returns an empty list when nothing is verified", () => {
    expect(
      claimableEmails(
        user([{ email: "pending@example.com", status: "unverified" }])
      )
    ).toEqual([]);
  });

  it("trims surrounding whitespace and lowercases", () => {
    expect(
      claimableEmails(user([{ email: "  Mixed@Case.COM \t", status: "verified" }]))
    ).toEqual(["mixed@case.com"]);
  });

  it("de-duplicates the same verified address (case-insensitively)", () => {
    expect(
      claimableEmails(
        user([
          { email: "dup@example.com", status: "verified" },
          { email: "DUP@example.com", status: "verified" },
        ])
      )
    ).toEqual(["dup@example.com"]);
  });

  it("skips blank email strings even if marked verified", () => {
    expect(
      claimableEmails(
        user([
          { email: "   ", status: "verified" },
          { email: "real@example.com", status: "verified" },
        ])
      )
    ).toEqual(["real@example.com"]);
  });

  it("handles a user with no email addresses", () => {
    expect(claimableEmails(user([]))).toEqual([]);
  });
});
