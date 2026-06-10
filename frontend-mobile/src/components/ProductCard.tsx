import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { ProductListItem } from "@/src/hooks/useProducts";
import { formatPrice } from "@/src/lib/format";
import { sizedImage } from "@/src/lib/images";

/**
 * The product-detail route to open. Detail is pushed within the *current* tab's
 * stack (so the tab bar stays visible), so the card is told which stack it lives
 * in — the Home tab and the Categories tab each have their own detail screen.
 */
export type ProductHref =
  | "/(tabs)/categories/product/[id]"
  | "/(tabs)/(home)/product/[id]";

/**
 * A product card: image, name, "from" price, and an out-of-stock marker. Used
 * both in the 2-column grid (omit `width` → it flexes to fill the column) and in
 * a horizontal rail (pass a fixed `width`). Tapping opens the detail screen.
 */
export function ProductCard({
  item,
  basePath,
  width,
}: {
  item: ProductListItem;
  basePath: ProductHref;
  width?: number;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: basePath, params: { id: String(item.id) } })
      }
      style={width != null ? { width } : undefined}
      className={`${
        width != null ? "" : "flex-1"
      } overflow-hidden rounded-2xl border border-border bg-card active:opacity-80`}
    >
      <View className="relative">
        <Image
          source={sizedImage(item.imageUrl, 400)}
          style={{ width: "100%", aspectRatio: 1 }}
          contentFit="cover"
          transition={200}
        />
        {!item.inStock && (
          <View className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2.5 py-1">
            <Text className="text-xs font-semibold text-background">
              Out of stock
            </Text>
          </View>
        )}
      </View>
      <View className="px-3 py-2.5">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="mt-0.5 text-xs text-muted">
          from {formatPrice(item.fromPriceCents)}
        </Text>
      </View>
    </Pressable>
  );
}
