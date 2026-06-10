import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CartEmpty } from "@/src/components/CartEmpty";
import { useCart } from "@/src/context/CartContext";
import { type CartItem, lineTotalCents } from "@/src/lib/cart";
import { formatPrice } from "@/src/lib/format";
import { sizedImage } from "@/src/lib/images";

// Icons/swatches need raw color values (not Tailwind classes); mirror the design
// tokens and pick by system scheme.
const chrome = {
  light: { accent: "#111827", muted: "#6b7280", border: "#e5e7eb", danger: "#dc2626" },
  dark: { accent: "#f5f5f5", muted: "#a3a3a3", border: "#404040", danger: "#f87171" },
};

/** A human-readable variant label, e.g. "M · Black". Empty for one-size items. */
function variantLabel(item: CartItem): string {
  return [item.size, item.colorName].filter(Boolean).join(" · ");
}

export default function CartScreen() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];
  const { items, totalCents, count, hydrated, setQty, removeItem } = useCart();

  // Hold the screen blank-but-stable until the saved cart is read, so a returning
  // shopper doesn't see the empty state flash before their items rehydrate.
  if (!hydrated) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={["top"]}>
        <ActivityIndicator color={c.accent} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Header count={0} />
        <CartEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Header count={count} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.variantId)}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <CartRow
            item={item}
            colors={c}
            onDecrement={() => setQty(item.variantId, item.qty - 1)}
            onIncrement={() => setQty(item.variantId, item.qty + 1)}
            onRemove={() => removeItem(item.variantId)}
          />
        )}
      />
      <Summary
        totalCents={totalCents}
        onCheckout={() =>
          Alert.alert("Checkout", "Checkout is coming in a later update.")
        }
      />
    </SafeAreaView>
  );
}

function Header({ count }: { count: number }) {
  return (
    <View className="px-5 pb-3 pt-2">
      <Text className="text-3xl font-bold text-foreground">Cart</Text>
      {count > 0 && (
        <Text className="mt-1 text-base text-muted">
          {count} {count === 1 ? "item" : "items"}
        </Text>
      )}
    </View>
  );
}

function CartRow({
  item,
  colors,
  onDecrement,
  onIncrement,
  onRemove,
}: {
  item: CartItem;
  colors: (typeof chrome)["light"];
  onDecrement: () => void;
  onIncrement: () => void;
  onRemove: () => void;
}) {
  const label = variantLabel(item);
  return (
    <View className="flex-row rounded-2xl border border-border bg-card p-3">
      <Image
        source={sizedImage(item.imageUrl, 240, 70)}
        style={{ width: 84, height: 84, borderRadius: 12 }}
        contentFit="cover"
        transition={150}
      />
      <View className="ml-3 flex-1 justify-between">
        <View>
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 pr-2 text-base font-semibold text-foreground" numberOfLines={2}>
              {item.name}
            </Text>
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              accessibilityLabel={`Remove ${item.name}`}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
          {label ? <Text className="mt-0.5 text-sm text-muted">{label}</Text> : null}
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <QtyStepper
            qty={item.qty}
            colors={colors}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
          />
          <Text className="text-base font-semibold text-foreground">
            {formatPrice(lineTotalCents(item))}
          </Text>
        </View>
      </View>
    </View>
  );
}

function QtyStepper({
  qty,
  colors,
  onDecrement,
  onIncrement,
}: {
  qty: number;
  colors: (typeof chrome)["light"];
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View className="flex-row items-center rounded-xl border border-border">
      <Pressable
        onPress={onDecrement}
        hitSlop={6}
        accessibilityLabel="Decrease quantity"
        className="px-3 py-1.5 active:opacity-60"
      >
        <Ionicons name="remove" size={18} color={colors.accent} />
      </Pressable>
      <Text className="min-w-8 text-center text-base font-semibold text-foreground">
        {qty}
      </Text>
      <Pressable
        onPress={onIncrement}
        hitSlop={6}
        accessibilityLabel="Increase quantity"
        className="px-3 py-1.5 active:opacity-60"
      >
        <Ionicons name="add" size={18} color={colors.accent} />
      </Pressable>
    </View>
  );
}

function Summary({
  totalCents,
  onCheckout,
}: {
  totalCents: number;
  onCheckout: () => void;
}) {
  return (
    <View className="border-t border-border bg-background px-5 pb-8 pt-3">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base text-muted">Total</Text>
        <Text className="text-2xl font-bold text-foreground">
          {formatPrice(totalCents)}
        </Text>
      </View>
      <Pressable
        onPress={onCheckout}
        className="items-center rounded-2xl bg-primary py-4 active:opacity-80"
      >
        <Text className="text-base font-semibold text-primary-foreground">Checkout</Text>
      </Pressable>
    </View>
  );
}
