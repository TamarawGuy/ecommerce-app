import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { ProductCard, type ProductHref } from "@/src/components/ProductCard";
import type { ProductListItem } from "@/src/hooks/useProducts";

// Icons/spinners need raw color values (not Tailwind classes); mirror the design
// tokens and pick by system scheme.
const chrome = {
  light: { muted: "#6b7280", accent: "#111827" },
  dark: { muted: "#a3a3a3", accent: "#f5f5f5" },
};

/**
 * Presentational 2-column product grid with loading / error / empty states.
 * Owns no data fetching — callers pass the products and request state — so it is
 * shared by category browse and Home search results. `basePath` routes a tapped
 * card to the detail screen in the caller's tab stack.
 */
export function ProductGrid({
  products,
  isLoading,
  isError,
  onRetry,
  basePath,
  emptyTitle = "No products yet",
  emptyHint,
}: {
  products: ProductListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  basePath: ProductHref;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];

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
          onPress={onRetry}
          className="mt-4 rounded-xl bg-primary px-5 py-2.5 active:opacity-80"
        >
          <Text className="font-semibold text-primary-foreground">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="bg-background"
      data={products ?? []}
      keyExtractor={(p) => String(p.id)}
      numColumns={2}
      contentContainerStyle={{ padding: 12, gap: 12, flexGrow: 1 }}
      columnWrapperStyle={{ gap: 12 }}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <ProductCard item={item} basePath={basePath} />
      )}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-8 py-24">
          <Ionicons name="pricetags-outline" size={44} color={c.muted} />
          <Text className="mt-4 text-center text-lg font-semibold text-foreground">
            {emptyTitle}
          </Text>
          {emptyHint && (
            <Text className="mt-1 text-center text-sm text-muted">{emptyHint}</Text>
          )}
        </View>
      }
    />
  );
}
