import type { Request, Response } from "express";

import { getUserId } from "../middleware/auth.js";
import {
  addToWishlist,
  getWishlist,
  mergeWishlist,
  removeFromWishlist,
} from "../services/wishlist.service.js";

/** All handlers run behind `requireUser`, so `getUserId` always resolves. */

export async function listWishlist(req: Request, res: Response): Promise<void> {
  try {
    const items = await getWishlist(getUserId(req));
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function addWishlistItem(
  req: Request,
  res: Response
): Promise<void> {
  const variantId = Number((req.body as { variantId?: unknown })?.variantId);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    res.status(400).json({ status: "error", message: "Invalid variantId" });
    return;
  }

  try {
    await addToWishlist(getUserId(req), variantId);
    res.status(201).json({ status: "ok" });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function removeWishlistItem(
  req: Request,
  res: Response
): Promise<void> {
  const variantId = Number(req.params.variantId);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    res.status(400).json({ status: "error", message: "Invalid variantId" });
    return;
  }

  try {
    await removeFromWishlist(getUserId(req), variantId);
    res.status(200).json({ status: "ok" });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function mergeWishlistItems(
  req: Request,
  res: Response
): Promise<void> {
  const raw = (req.body as { variantIds?: unknown })?.variantIds;
  if (!Array.isArray(raw) || !raw.every((v) => typeof v === "number")) {
    res
      .status(400)
      .json({ status: "error", message: "variantIds must be a number array" });
    return;
  }

  try {
    const items = await mergeWishlist(getUserId(req), raw);
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
