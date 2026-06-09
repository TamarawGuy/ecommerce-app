import { Router } from "express";

import {
  getProductById,
  getProducts,
} from "../controllers/products.controller.js";

export const productsRouter = Router();

// GET /products?categoryIds=1,2,3 — leaf-filtered list with per-product aggregates.
productsRouter.get("/", getProducts);
// GET /products/:id — a single product with its variants.
productsRouter.get("/:id", getProductById);
