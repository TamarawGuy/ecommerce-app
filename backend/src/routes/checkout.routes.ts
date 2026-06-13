import { Router } from "express";

import { postCheckout } from "../controllers/checkout.controller.js";

export const checkoutRouter = Router();

// POST /checkout — guest-allowed (no requireUser). The global clerkMiddleware
// still attaches an optional userId for signed-in buyers, which the controller
// links onto the order.
checkoutRouter.post("/", postCheckout);

export default checkoutRouter;
