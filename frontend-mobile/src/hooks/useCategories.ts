import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type { CategoryRow } from "../lib/category-tree";

interface CategoriesResponse {
  categories: CategoryRow[];
}

/**
 * Fetches the full flat category list. The catalog tree is small and rarely
 * changes, so it is fetched once and cached for the session; the tree is built
 * and traversed in memory from this list (see the `category-tree` module).
 */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiFetch<CategoriesResponse>("/categories")).categories,
    staleTime: Infinity,
  });
}
