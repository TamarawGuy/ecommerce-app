import type { Request, Response } from "express";

import {
  getProduct,
  listProducts,
} from "../services/products.service.js";

/** Parses a `?categoryIds=1,2,3` query into a list of positive integers. */
function parseCategoryIds(raw: unknown): number[] | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : undefined;
}

export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const categoryIds = parseCategoryIds(req.query.categoryIds);
    const items = await listProducts(categoryIds);
    res.status(200).json({ products: items });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function getProductById(
  req: Request,
  res: Response
): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ status: "error", message: "Invalid product id" });
    return;
  }

  try {
    const product = await getProduct(id);
    if (!product) {
      res.status(404).json({ status: "error", message: "Product not found" });
      return;
    }
    res.status(200).json({ product });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
