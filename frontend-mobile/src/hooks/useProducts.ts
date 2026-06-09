import { useQuery } from "@tanstack/react-query";

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

/**
 * Lists products under a set of leaf categories. The caller resolves a tapped
 * category to its descendant leaf ids (see the `category-tree` module) and passes
 * them here. The key is the sorted id list so the same leaves hit one cache
 * entry; the query is disabled until there is at least one id.
 */
export function useProducts(categoryIds: number[]) {
  const sorted = [...categoryIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["products", sorted],
    queryFn: async () =>
      (
        await apiFetch<{ products: ProductListItem[] }>(
          `/products?categoryIds=${sorted.join(",")}`
        )
      ).products,
    enabled: sorted.length > 0,
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
