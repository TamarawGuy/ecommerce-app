import { Router } from "express";

import { getOrders } from "../controllers/orders.controller.js";
import { requireUser } from "../middleware/auth.js";

export const ordersRouter = Router();

// Order history is per-user account state, so every route requires a Clerk
// session JWT (401 otherwise) and is scoped to that user in the service layer.
ordersRouter.use(requireUser);

// GET /orders — the user's orders (newest first), each with line items + status.
// Claims any matching past guest orders before listing (claim-on-read).
ordersRouter.get("/", getOrders);

export default ordersRouter;
