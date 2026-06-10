import { FlatList, Text, View } from "react-native";

import { ProductCard, type ProductHref } from "@/src/components/ProductCard";
import type { ProductListItem } from "@/src/hooks/useProducts";

const CARD_WIDTH = 160;

/**
 * A titled, horizontally-scrolling rail of product cards (e.g. "Featured", "New
 * in"). Renders nothing when there are no products, so an empty rail simply
 * disappears rather than showing a blank section.
 */
export function ProductRail({
  title,
  products,
  basePath,
}: {
  title: string;
  products: ProductListItem[];
  basePath: ProductHref;
}) {
  if (products.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="px-4 text-lg font-bold text-foreground">{title}</Text>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(p) => String(p.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
        renderItem={({ item }) => (
          <ProductCard item={item} basePath={basePath} width={CARD_WIDTH} />
        )}
      />
    </View>
  );
}
