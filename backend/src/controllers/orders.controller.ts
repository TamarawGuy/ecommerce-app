import type { Request, Response } from "express";

import { getUserId } from "../middleware/auth.js";
import { claimOrdersForUser } from "../services/claim-orders.service.js";
import { listOrders } from "../services/orders.service.js";

/**
 * The signed-in user's order history. Runs behind `requireUser`, so `getUserId`
 * always resolves.
 *
 * Before listing, we **claim** any past guest orders that match the user's
 * verified emails (claim-on-read). This is what makes orders placed as a guest,
 * then signed up for, appear automatically. Claiming is best-effort: if the
 * Clerk lookup fails we log and still return whatever the user already owns —
 * claiming is an enrichment, never a gate on viewing history, and the next read
 * retries. (A future webhook on Render claims proactively; this guarantees it
 * even before that exists.)
 */
export async function getOrders(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);

  try {
    await claimOrdersForUser(userId);
  } catch (err) {
    console.error(
      `claimOrdersForUser failed for ${userId}; serving existing history`,
      err
    );
  }

  try {
    const items = await listOrders(userId);
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
