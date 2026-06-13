import type { Request, Response } from "express";

import { getUserId } from "../middleware/auth.js";
import { getUserById } from "../services/users.service.js";

/**
 * Returns the current user's synced profile. Proves the JWT round-trip: the
 * request reached here only because `requireUser` accepted the Clerk token.
 *
 * The DB row is written asynchronously by the Clerk webhook, so a freshly
 * signed-up user may hit this before the `user.created` delivery lands (or
 * before the webhook endpoint exists at all, in dev). We never block on that —
 * the verified `userId` from the token is authoritative on its own, so we return
 * it with `synced: false` and a null `user` rather than a 404.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const user = await getUserById(userId);
    res.status(200).json({ userId, synced: user !== null, user });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
