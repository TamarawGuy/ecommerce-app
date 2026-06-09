import type { Request, Response } from "express";
import { checkHealth } from "../services/health.service.js";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  try {
    const health = await checkHealth();
    res.status(200).json(health);
  } catch (err) {
    res.status(503).json({
      status: "error",
      db: "unreachable",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
