import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";

/**
 * Route guard for endpoints that require a signed-in user. `clerkMiddleware()`
 * (mounted globally in `app.ts`) verifies the incoming Clerk session JWT and
 * attaches the auth context; here we read it and reject anything without a
 * `userId`. Unlike Clerk's deprecated `requireAuth()`, this returns a 401 JSON
 * error (rather than redirecting to a sign-in URL), which is what an API client
 * expects. Downstream handlers read the id via `getUserId(req)`.
 */
export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ status: "error", message: "Unauthorized" });
    return;
  }
  next();
}

/**
 * The Clerk `userId` for the current request. Only call this behind
 * `requireUser` (or after checking yourself) — it throws if there is no
 * authenticated user, so a missing id is a programming error, never a silent
 * null that leaks another user's data.
 */
export function getUserId(req: Request): string {
  const { userId } = getAuth(req);
  if (!userId) throw new Error("getUserId called without an authenticated user");
  return userId;
}
