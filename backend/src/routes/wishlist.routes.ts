import { Router } from "express";

import {
  addWishlistItem,
  listWishlist,
  mergeWishlistItems,
  removeWishlistItem,
} from "../controllers/wishlist.controller.js";
import { requireUser } from "../middleware/auth.js";

export const wishlistRouter = Router();

// The whole wishlist is per-user state, so every route requires a Clerk session
// JWT (401 otherwise). Guests have no server wishlist — they keep a device-local
// list that is merged in here (`POST /merge`) on first login.
wishlistRouter.use(requireUser);

// GET    /wishlist            — the user's saved items (newest first).
wishlistRouter.get("/", listWishlist);
// POST   /wishlist            — add one variant ({ variantId }); idempotent.
wishlistRouter.post("/", addWishlistItem);
// POST   /wishlist/merge      — union-merge a guest list ({ variantIds }).
wishlistRouter.post("/merge", mergeWishlistItems);
// DELETE /wishlist/:variantId — remove one variant.
wishlistRouter.delete("/:variantId", removeWishlistItem);

export default wishlistRouter;
