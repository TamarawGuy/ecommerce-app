import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WishlistEmpty } from "@/src/components/WishlistEmpty";
import { useWishlist } from "@/src/context/WishlistContext";
import { formatPrice } from "@/src/lib/format";
import { sizedImage } from "@/src/lib/images";
import type { WishlistItem } from "@/src/lib/wishlist";

// Icons/swatches need raw color values (not Tailwind classes); mirror the design
// tokens and pick by system scheme.
const chrome = {
  light: { accent: "#111827", muted: "#6b7280", danger: "#dc2626" },
  dark: { accent: "#f5f5f5", muted: "#a3a3a3", danger: "#f87171" },
};

/** A human-readable variant label, e.g. "M · Black". Empty for one-size items. */
function variantLabel(item: WishlistItem): string {
  return [item.size, item.colorName].filter(Boolean).join(" · ");
}

export default function WishlistScreen() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];
  const { items, isReady, toggle } = useWishlist();

  // Hold the screen blank-but-stable until the active source has produced its
  // first result, so a returning shopper doesn't see the empty state flash.
  if (!isReady) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-background"
        edges={["top"]}
      >
        <ActivityIndicator color={c.accent} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Header count={0} />
        <WishlistEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Header count={items.length} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.variantId)}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <WishlistRow item={item} colors={c} onRemove={() => toggle(item)} />
        )}
      />
    </SafeAreaView>
  );
}

function Header({ count }: { count: number }) {
  return (
    <View className="px-5 pb-3 pt-2">
      <Text className="text-3xl font-bold text-foreground">Wishlist</Text>
      {count > 0 && (
        <Text className="mt-1 text-base text-muted">
          {count} {count === 1 ? "item" : "items"}
        </Text>
      )}
    </View>
  );
}

function WishlistRow({
  item,
  colors,
  onRemove,
}: {
  item: WishlistItem;
  colors: (typeof chrome)["light"];
  onRemove: () => void;
}) {
  const router = useRouter();
  const label = variantLabel(item);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/wishlist/product/[id]",
          params: { id: String(item.productId) },
        })
      }
      className="flex-row rounded-2xl border border-border bg-card p-3 active:opacity-80"
    >
      <View className="relative">
        <Image
          source={sizedImage(item.imageUrl, 240, 70)}
          style={{ width: 84, height: 84, borderRadius: 12 }}
          contentFit="cover"
          transition={150}
        />
        {!item.inStock && (
          <View className="absolute left-1 top-1 rounded-full bg-foreground/80 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-background">
              Out of stock
            </Text>
          </View>
        )}
      </View>

      <View className="ml-3 flex-1 justify-between">
        <View>
          <View className="flex-row items-start justify-between">
            <Text
              className="flex-1 pr-2 text-base font-semibold text-foreground"
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name} from wishlist`}
            >
              <Ionicons name="heart" size={22} color={colors.danger} />
            </Pressable>
          </View>
          {label ? (
            <Text className="mt-0.5 text-sm text-muted">{label}</Text>
          ) : null}
        </View>

        <Text className="text-base font-semibold text-foreground">
          {formatPrice(item.priceCents)}
        </Text>
      </View>
    </Pressable>
  );
}
