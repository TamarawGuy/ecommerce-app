import type { Request, Response } from "express";

import { parseProductQuery } from "../lib/product-query.js";
import {
  getProduct,
  listProducts,
} from "../services/products.service.js";

export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const query = parseProductQuery(req.query as Record<string, unknown>);
    const items = await listProducts(query);
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
