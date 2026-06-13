import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { healthRouter } from "./routes/health.routes.js";
import { categoriesRouter } from "./routes/categories.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { meRouter } from "./routes/me.routes.js";
import { wishlistRouter } from "./routes/wishlist.routes.js";
import { addressesRouter } from "./routes/addresses.routes.js";
import { checkoutRouter } from "./routes/checkout.routes.js";
import { webhooksRouter } from "./routes/webhooks.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());

  // Verifies the Clerk session JWT (if present) and attaches the auth context to
  // every request; it never rejects on its own — route guards (`requireUser`) do.
  // Reads CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY from the environment.
  app.use(clerkMiddleware());

  // The Clerk webhook needs the raw body for signature verification, so it is
  // mounted *before* `express.json()` (its router applies `express.raw`).
  app.use("/webhooks", webhooksRouter);

  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/categories", categoriesRouter);
  app.use("/products", productsRouter);
  app.use("/me", meRouter);
  app.use("/wishlist", wishlistRouter);
  app.use("/addresses", addressesRouter);
  app.use("/checkout", checkoutRouter);

  // Fallback 404
  app.use((_req, res) => {
    res.status(404).json({ status: "error", message: "Not found" });
  });

  return app;
}
