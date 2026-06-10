import { useMemo } from "react";

import { ProductGrid } from "@/src/components/ProductGrid";
import { useProducts } from "@/src/hooks/useProducts";
import { descendantLeafIds, type CategoryNode } from "@/src/lib/category-tree";

/**
 * The product list under a (leaf) category. Resolves the tapped category to its
 * descendant leaf ids from the in-memory tree — products attach to leaves only —
 * and queries the catalog for them, so this also works for a non-leaf node.
 */
export function ProductList({
  tree,
  categoryId,
}: {
  tree: CategoryNode[];
  categoryId: number;
}) {
  const leafIds = useMemo(
    () => descendantLeafIds(tree, categoryId),
    [tree, categoryId]
  );
  const { data, isLoading, isError, refetch } = useProducts(
    { categoryIds: leafIds },
    { enabled: leafIds.length > 0 }
  );

  return (
    <ProductGrid
      products={data}
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      basePath="/(tabs)/categories/product/[id]"
      emptyTitle="No products yet"
      emptyHint="Check back soon — we're still stocking this category."
    />
  );
}
