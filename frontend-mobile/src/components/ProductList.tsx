import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { useProducts, type ProductListItem } from "@/src/hooks/useProducts";
import { descendantLeafIds, type CategoryNode } from "@/src/lib/category-tree";
import { formatPrice } from "@/src/lib/format";
import { sizedImage } from "@/src/lib/images";

// Icons/spinners need raw color values (not Tailwind classes); mirror the design
// tokens and pick by system scheme, matching the rest of the category chrome.
const chrome = {
  light: { muted: "#6b7280", accent: "#111827" },
  dark: { muted: "#a3a3a3", accent: "#f5f5f5" },
};

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
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];

  const leafIds = useMemo(
    () => descendantLeafIds(tree, categoryId),
    [tree, categoryId]
  );
  const { data, isLoading, isError, refetch } = useProducts(leafIds);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Ionicons name="cloud-offline-outline" size={40} color={c.muted} />
        <Text className="mt-3 text-center text-base text-muted">
          Couldn&apos;t load products.
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-4 rounded-xl bg-primary px-5 py-2.5 active:opacity-80"
        >
          <Text className="font-semibold text-primary-foreground">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Ionicons name="pricetags-outline" size={44} color={c.muted} />
        <Text className="mt-4 text-center text-lg font-semibold text-foreground">
          No products yet
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Check back soon — we&apos;re still stocking this category.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      className="bg-background"
      data={data}
      keyExtractor={(p) => String(p.id)}
      numColumns={2}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      columnWrapperStyle={{ gap: 12 }}
      renderItem={({ item }) => <ProductCard item={item} mutedColor={c.muted} />}
    />
  );
}

function ProductCard({
  item,
  mutedColor,
}: {
  item: ProductListItem;
  mutedColor: string;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/categories/product/[id]",
          params: { id: String(item.id) },
        })
      }
      className="flex-1 overflow-hidden rounded-2xl border border-border bg-card active:opacity-80"
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
