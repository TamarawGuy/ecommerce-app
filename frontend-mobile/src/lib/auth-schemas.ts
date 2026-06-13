// Zod is the single source of truth for the auth forms' shape and validation,
// consumed by react-hook-form via @hookform/resolvers. Clerk enforces its own
// password policy server-side; the 8-char minimum here is a fast client-side
// gate before we ever call Clerk.

import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address");
const newPassword = z.string().min(8, "Use at least 8 characters");
const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email,
  password: newPassword,
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const verificationSchema = z.object({ code });
export type VerificationValues = z.infer<typeof verificationSchema>;

export const resetRequestSchema = z.object({ email });
export type ResetRequestValues = z.infer<typeof resetRequestSchema>;

export const resetConfirmSchema = z.object({ code, password: newPassword });
export type ResetConfirmValues = z.infer<typeof resetConfirmSchema>;
