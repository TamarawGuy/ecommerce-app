import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes.js";
import { categoriesRouter } from "./routes/categories.routes.js";
import { productsRouter } from "./routes/products.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/categories", categoriesRouter);
  app.use("/products", productsRouter);

  // Fallback 404
  app.use((_req, res) => {
    res.status(404).json({ status: "error", message: "Not found" });
  });

  return app;
}
