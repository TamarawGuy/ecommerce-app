import type { Request, Response } from "express";

import { listCategories } from "../services/categories.service.js";

export async function getCategories(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const categories = await listCategories();
    res.status(200).json({ categories });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
