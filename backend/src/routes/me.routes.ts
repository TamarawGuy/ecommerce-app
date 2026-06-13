import { Router } from "express";

import { getMe } from "../controllers/me.controller.js";
import { requireUser } from "../middleware/auth.js";

export const meRouter = Router();

// Protected: rejects requests without a valid Clerk session JWT (401).
meRouter.get("/", requireUser, getMe);
