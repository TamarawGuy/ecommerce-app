import express, { Router } from "express";

import { postClerkWebhook } from "../controllers/webhooks.controller.js";

export const webhooksRouter = Router();

// Svix verifies the signature over the *raw* request bytes, so this route parses
// the body as a Buffer instead of JSON. It must be mounted before the global
// `express.json()` (see `app.ts`) so the stream isn't consumed first.
webhooksRouter.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  postClerkWebhook
);
