import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  products,
  variants,
  type Product,
  type Variant,
} from "../db/schema.js";

/**
 * A product as shown on a list/card. The per-product aggregates — the "from"
 * price (cheapest variant) and an in-stock flag — are computed here so cards
 * render without an N+1 query per product. `imageUrl` is a representative image
 * (the first variant's) for the card thumbnail.
 */
export interface ProductListItem {
  id: number;
  name: string;
  isFeatured: boolean;
  fromPriceCents: number;
  inStock: boolean;
  imageUrl: string | null;
}

/** A product with its full variant set, for the detail screen. */
export interface ProductDetail extends Product {
  variants: Variant[];
}

/**
 * Lists products, optionally restricted to a set of (leaf) category ids. The
 * caller resolves a tapped category to its descendant leaf ids client-side (see
 * the `category-tree` module) and passes them here, since products attach to
 * leaves only. With no ids the whole catalog is returned.
 *
 * Runs two queries total — products, then all their variants — and aggregates in
 * memory, so adding products never adds queries (no N+1). Featured products sort
 * first, then by name.
 */
export async function listProducts(
  categoryIds?: number[]
): Promise<ProductListItem[]> {
  const productRows =
    categoryIds && categoryIds.length > 0
      ? await db
          .select()
          .from(products)
          .where(inArray(products.categoryId, categoryIds))
          .orderBy(desc(products.isFeatured), asc(products.name))
      : await db
          .select()
          .from(products)
          .orderBy(desc(products.isFeatured), asc(products.name));

  if (productRows.length === 0) return [];

  const variantRows = await db
    .select()
    .from(variants)
    .where(
      inArray(
        variants.productId,
        productRows.map((p) => p.id)
      )
    );

  const variantsByProduct = new Map<number, Variant[]>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.productId);
    if (list) list.push(v);
    else variantsByProduct.set(v.productId, [v]);
  }

  return productRows.map((p) => {
    const pv = variantsByProduct.get(p.id) ?? [];
    return {
      id: p.id,
      name: p.name,
      isFeatured: p.isFeatured,
      fromPriceCents: pv.length
        ? Math.min(...pv.map((v) => v.priceCents))
        : 0,
      inStock: pv.some((v) => v.stock > 0),
      imageUrl: pv[0]?.imageUrl ?? null,
    };
  });
}

/** Returns a product with its variants, or `null` if no such product exists. */
export async function getProduct(id: number): Promise<ProductDetail | null> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id));
  if (!product) return null;

  const productVariants = await db
    .select()
    .from(variants)
    .where(eq(variants.productId, id))
    .orderBy(asc(variants.id));

  return { ...product, variants: productVariants };
}
