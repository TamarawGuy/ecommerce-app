import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type { Variant } from "../lib/variant-resolver";

/** A product as shown on a card; aggregates ("from" price, in-stock) come from the API. */
export interface ProductListItem {
  id: number;
  name: string;
  isFeatured: boolean;
  fromPriceCents: number;
  inStock: boolean;
  imageUrl: string | null;
}

/** A product with its full variant set, for the detail screen. */
export interface ProductDetail {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  isFeatured: boolean;
  createdAt: string;
  variants: Variant[];
}

/** Sort orders supported by `GET /products` (mirrors the backend). */
export type ProductSort = "featured" | "price_asc" | "price_desc" | "newest";

/**
 * Discovery query for `GET /products`. Every field is optional; an empty query
 * returns the whole catalog, featured-first. Prices are integer **cents**.
 */
export interface ProductQuery {
  /** Leaf category ids (resolved from a tapped category via the tree). */
  categoryIds?: number[];
  q?: string;
  sort?: ProductSort;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
}

/**
 * Serializes a {@link ProductQuery} into a canonical querystring. `categoryIds`
 * is sorted and the default `featured` sort is omitted so equivalent queries map
 * to the same string — which also makes it a stable TanStack Query cache key.
 */
function buildProductSearch(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.categoryIds?.length) {
    params.set(
      "categoryIds",
      [...query.categoryIds].sort((a, b) => a - b).join(",")
    );
  }
  const q = query.q?.trim();
  if (q) params.set("q", q);
  if (query.sort && query.sort !== "featured") params.set("sort", query.sort);
  if (query.minPriceCents != null)
    params.set("minPrice", String(query.minPriceCents));
  if (query.maxPriceCents != null)
    params.set("maxPrice", String(query.maxPriceCents));
  if (query.inStock) params.set("inStock", "true");
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * Lists products for discovery (Home rails, search, filter, sort) and category
 * browse. Pass any combination of search/filter/sort; the server computes the
 * per-product aggregates so cards render without an N+1. Previous results are
 * kept while the next query loads, so typing in search doesn't flash empty.
 *
 * `opts.enabled` gates the request (e.g. disable the results query while the
 * Home screen is showing its curated rails).
 */
export function useProducts(
  query: ProductQuery,
  opts?: { enabled?: boolean }
) {
  const search = buildProductSearch(query);
  return useQuery({
    queryKey: ["products", search],
    queryFn: async () =>
      (await apiFetch<{ products: ProductListItem[] }>(`/products${search}`))
        .products,
    enabled: opts?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** Fetches a single product with its variants for the detail screen. */
export function useProduct(id: number) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () =>
      (await apiFetch<{ product: ProductDetail }>(`/products/${id}`)).product,
    enabled: Number.isFinite(id) && id > 0,
  });
}
