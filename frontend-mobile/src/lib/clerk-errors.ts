// Clerk throws `ClerkAPIResponseError` with a structured `errors` array; the
// `longMessage` is the user-facing text (e.g. "Password has been found in an
// online data breach"). We read it structurally rather than importing a type
// guard, so an SDK shape change degrades to the fallback instead of crashing.

interface ClerkApiError {
  message?: string;
  longMessage?: string;
}

export function clerkErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors?: unknown }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0] as ClerkApiError;
      return first.longMessage ?? first.message ?? fallback;
    }
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
