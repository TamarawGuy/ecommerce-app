import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductGrid } from "@/src/components/ProductGrid";
import { ProductRail } from "@/src/components/ProductRail";
import { SearchBar } from "@/src/components/SearchBar";
import { SortMenu, sortLabel } from "@/src/components/SortMenu";
import {
  EMPTY_FILTERS,
  FilterSheet,
  hasActiveFilters,
  type DiscoveryFilters,
} from "@/src/components/FilterSheet";
import { useCategories } from "@/src/hooks/useCategories";
import {
  useProducts,
  type ProductListItem,
  type ProductSort,
} from "@/src/hooks/useProducts";
import { buildTree, descendantLeafIds } from "@/src/lib/category-tree";

const HOME_PRODUCT_PATH = "/(tabs)/(home)/product/[id]" as const;
const RAIL_LIMIT = 10;

const chrome = {
  light: { muted: "#6b7280", accent: "#111827" },
  dark: { muted: "#a3a3a3", accent: "#f5f5f5" },
};

/**
 * Home / discovery. By default it shows curated rails ("Featured", "New in");
 * once the shopper searches, filters, or picks a non-default sort it switches to
 * a single results grid. Everything works as a guest — there is no auth gate.
 */
export default function HomeScreen() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];

  const [searchText, setSearchText] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<ProductSort>("featured");
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Debounce the search term so we query once typing settles, not per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: categoryRows } = useCategories();
  const tree = useMemo(() => buildTree(categoryRows ?? []), [categoryRows]);

  // A chosen category (at any depth) resolves to its descendant leaf ids, since
  // products attach to leaves only.
  const categoryIds = useMemo(
    () =>
      filters.categoryId != null
        ? descendantLeafIds(tree, filters.categoryId)
        : undefined,
    [tree, filters.categoryId]
  );

  const filtersActive = hasActiveFilters(filters);
  // Browse mode (rails) until the shopper searches, filters, or re-sorts.
  const isBrowsing =
    debouncedQ === "" && sort === "featured" && !filtersActive;

  // Rails: one "newest-first" query feeds both the "New in" and "Featured" rails.
  const railsQuery = useProducts({ sort: "newest" }, { enabled: isBrowsing });
  const railProducts = railsQuery.data ?? [];
  const newIn = railProducts.slice(0, RAIL_LIMIT);
  const featured = railProducts
    .filter((p) => p.isFeatured)
    .slice(0, RAIL_LIMIT);

  // Results: the composed search/filter/sort query.
  const resultsQuery = useProducts(
    {
      q: debouncedQ,
      sort,
      categoryIds,
      minPriceCents: filters.minPriceCents,
      maxPriceCents: filters.maxPriceCents,
      inStock: filters.inStock,
    },
    { enabled: !isBrowsing }
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-4 pb-3 pt-2">
          <Text className="mb-3 text-3xl font-bold text-foreground">Discover</Text>
          <SearchBar value={searchText} onChangeText={setSearchText} />
          <View className="mt-3 flex-row gap-3">
            <ControlButton
              icon="options-outline"
              label="Filters"
              badge={filtersActive}
              accent={c.accent}
              muted={c.muted}
              onPress={() => setFilterOpen(true)}
            />
            <ControlButton
              icon="swap-vertical-outline"
              label={sortLabel(sort)}
              accent={c.accent}
              muted={c.muted}
              onPress={() => setSortOpen(true)}
            />
          </View>
        </View>
      </SafeAreaView>

      {isBrowsing ? (
        <BrowseRails
          isLoading={railsQuery.isLoading}
          isError={railsQuery.isError}
          onRetry={railsQuery.refetch}
          featured={featured}
          newIn={newIn}
          accent={c.accent}
          muted={c.muted}
        />
      ) : (
        <ProductGrid
          products={resultsQuery.data}
          isLoading={resultsQuery.isLoading}
          isError={resultsQuery.isError}
          onRetry={resultsQuery.refetch}
          basePath={HOME_PRODUCT_PATH}
          emptyTitle="No matches"
          emptyHint="Try a different search or loosen your filters."
        />
      )}

      <FilterSheet
        visible={filterOpen}
        tree={tree}
        value={filters}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />
      <SortMenu
        visible={sortOpen}
        value={sort}
        onSelect={setSort}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

function BrowseRails({
  isLoading,
  isError,
  onRetry,
  featured,
  newIn,
  accent,
  muted,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  featured: ProductListItem[];
  newIn: ProductListItem[];
  accent: string;
  muted: string;
}) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="cloud-offline-outline" size={40} color={muted} />
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
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <ProductRail
        title="Featured"
        products={featured}
        basePath={HOME_PRODUCT_PATH}
      />
      <ProductRail title="New in" products={newIn} basePath={HOME_PRODUCT_PATH} />
    </ScrollView>
  );
}

function ControlButton({
  icon,
  label,
  badge,
  accent,
  muted,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: boolean;
  accent: string;
  muted: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 active:opacity-70"
    >
      <Ionicons name={icon} size={16} color={accent} />
      <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
        {label}
      </Text>
      {badge && <View className="ml-0.5 h-2 w-2 rounded-full bg-primary" />}
      {!badge && (
        <Ionicons name="chevron-down" size={14} color={muted} />
      )}
    </Pressable>
  );
}
