import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { useCategories } from "@/src/hooks/useCategories";
import {
  buildTree,
  findNode,
  type CategoryNode,
} from "@/src/lib/category-tree";

// Icons/spinners need raw color values (not Tailwind classes); mirror the design
// tokens and pick by system scheme, matching the tabs/header chrome.
const chrome = {
  light: { muted: "#6b7280", accent: "#111827" },
  dark: { muted: "#a3a3a3", accent: "#f5f5f5" },
};

/**
 * Renders one level of the category tree and drives the drill-down.
 *
 * The full flat list is fetched once and the tree is built in memory. When
 * `categoryId` is omitted we show the roots (the Categories tab entry); when it
 * is set we show that category's children, or a "products coming soon" leaf state
 * if it has none. Tapping any category pushes the next level onto the stack.
 */
export function CategoryBrowser({ categoryId }: { categoryId?: number }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];
  const { data, isLoading, isError, refetch } = useCategories();

  const tree = useMemo(() => buildTree(data ?? []), [data]);
  const node = categoryId != null ? findNode(tree, categoryId) : undefined;

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
          Couldn&apos;t load categories.
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

  // A category id was requested but isn't in the (loaded) tree.
  if (categoryId != null && !node) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-base text-muted">Category not found.</Text>
      </View>
    );
  }

  const children = node ? node.children : tree;
  const isLeaf = node != null && children.length === 0;

  return (
    <View className="flex-1 bg-background">
      {/* Dynamic header title for drill-down screens. */}
      {node && <Stack.Screen options={{ title: node.name }} />}

      {isLeaf ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="pricetags-outline" size={44} color={c.muted} />
          <Text className="mt-4 text-center text-lg font-semibold text-foreground">
            {node!.name}
          </Text>
          <Text className="mt-1 text-center text-sm text-muted">
            Products in this category are coming soon.
          </Text>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => <CategoryCard node={item} mutedColor={c.muted} />}
        />
      )}
    </View>
  );
}

function CategoryCard({
  node,
  mutedColor,
}: {
  node: CategoryNode;
  mutedColor: string;
}) {
  const childCount = node.children.length;
  const isLeaf = childCount === 0;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/categories/[id]",
          params: { id: String(node.id) },
        })
      }
      className="flex-row items-center overflow-hidden rounded-2xl border border-border bg-card active:opacity-80"
    >
      <Image
        source={node.imageUrl}
        style={{ width: 76, height: 76 }}
        contentFit="cover"
        transition={200}
      />
      <View className="flex-1 px-4 py-3">
        <Text className="text-base font-semibold text-foreground">{node.name}</Text>
        <Text className="mt-0.5 text-xs text-muted">
          {isLeaf
            ? "View products"
            : `${childCount} ${childCount === 1 ? "category" : "categories"}`}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={mutedColor}
        style={{ marginRight: 12 }}
      />
    </Pressable>
  );
}
