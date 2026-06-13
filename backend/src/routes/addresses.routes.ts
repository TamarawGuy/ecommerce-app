import { Router } from "express";

import {
  getAddresses,
  makeDefaultAddress,
  patchAddress,
  postAddress,
  removeAddress,
} from "../controllers/addresses.controller.js";
import { requireUser } from "../middleware/auth.js";

export const addressesRouter = Router();

// Saved addresses are per-user state, so every route requires a Clerk session
// JWT (401 otherwise) and is scoped to that user in the service layer.
addressesRouter.use(requireUser);

// GET    /addresses             — the user's addresses (default first).
addressesRouter.get("/", getAddresses);
// POST   /addresses             — create one ({ ...fields, isDefault? }).
addressesRouter.post("/", postAddress);
// PATCH  /addresses/:id         — edit one address's fields.
addressesRouter.patch("/:id", patchAddress);
// POST   /addresses/:id/default — mark one as default (unsets the previous).
addressesRouter.post("/:id/default", makeDefaultAddress);
// DELETE /addresses/:id         — delete one (promotes a survivor if default).
addressesRouter.delete("/:id", removeAddress);

export default addressesRouter;
