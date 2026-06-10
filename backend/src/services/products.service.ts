import { and, asc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  products,
  variants,
  type Product,
  type Variant,
} from "../db/schema.js";
import {
  filterByPriceAndStock,
  sortProducts,
  type ProductQuery,
} from "../lib/product-query.js";

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
 * Builds the SQL `WHERE` for the product-row query from the category and text
 * filters. The price/stock filters and sort act on the per-product aggregates,
 * which only exist after the variants are joined in memory, so they are applied
 * later (see {@link listProducts}) rather than here.
 *
 * Search (`q`) matches two ways: a substring `ILIKE` over name *and*
 * description (the common case, accelerated by the `pg_trgm` GIN index added in
 * the discovery migration), *or* trigram word-similarity over the name so
 * misspellings still match. The `%` operator compares whole strings — useless
 * against multi-word product names — so we use `word_similarity(q, name)`,
 * which scores `q` against the closest word. A 0.4 threshold catches real typos
 * (e.g. "sneker" → "Sneakers" ≈ 0.43) while rejecting near-noise. Fuzziness is
 * scoped to the (short, curated) name; descriptions are long prose where
 * approximate matching mostly adds noise, so they match by substring only.
 */
const SEARCH_SIMILARITY_THRESHOLD = 0.4;

function buildProductWhere(query: ProductQuery): SQL | undefined {
  const conditions: SQL[] = [];

  if (query.categoryIds && query.categoryIds.length > 0) {
    conditions.push(inArray(products.categoryId, query.categoryIds));
  }

  if (query.q) {
    const like = `%${query.q}%`;
    conditions.push(
      or(
        ilike(products.name, like),
        ilike(products.description, like),
        sql`word_similarity(${query.q}, ${products.name}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
      )!
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

/**
 * Lists products for the discovery screen. Applies the text/category filters in
 * SQL, then computes each product's aggregates ("from" price + in-stock) from
 * its variants and applies the price/stock filters and sort in memory.
 *
 * Runs two queries total — matching products, then all their variants — so
 * adding products never adds queries (no N+1). With no filters the whole catalog
 * is returned, featured-first.
 */
export async function listProducts(
  query: ProductQuery
): Promise<ProductListItem[]> {
  const productRows = await db
    .select()
    .from(products)
    .where(buildProductWhere(query));

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

  // Enrich each product with its aggregates. `createdAt` is carried for the
  // `newest` sort and dropped from the public payload below.
  const enriched = productRows.map((p) => {
    const pv = variantsByProduct.get(p.id) ?? [];
    return {
      id: p.id,
      name: p.name,
      isFeatured: p.isFeatured,
      createdAt: p.createdAt,
      fromPriceCents: pv.length ? Math.min(...pv.map((v) => v.priceCents)) : 0,
      inStock: pv.some((v) => v.stock > 0),
      imageUrl: pv[0]?.imageUrl ?? null,
    };
  });

  const filtered = filterByPriceAndStock(enriched, query);
  const sorted = sortProducts(filtered, query.sort);

  return sorted.map(({ createdAt: _createdAt, ...item }) => item);
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
