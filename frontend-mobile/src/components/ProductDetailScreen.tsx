import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { useCart } from "@/src/context/CartContext";
import { useWishlist } from "@/src/context/WishlistContext";
import { useProduct } from "@/src/hooks/useProducts";
import { formatPrice } from "@/src/lib/format";
import { sizedImage } from "@/src/lib/images";
import {
  resolveVariant,
  type Selection,
} from "@/src/lib/variant-resolver";

// Icons/swatches need raw color values (not Tailwind classes); mirror the design
// tokens and pick by system scheme.
const chrome = {
  light: { muted: "#6b7280", accent: "#111827", ring: "#111827", border: "#e5e7eb", danger: "#dc2626" },
  dark: { muted: "#a3a3a3", accent: "#f5f5f5", ring: "#f5f5f5", border: "#404040", danger: "#f87171" },
};

/**
 * The product detail screen. Tab-agnostic — both the Home and Categories stacks
 * render it for their own `product/[id]` route — so it reads the `id` from the
 * route params and sets its own header title.
 */
export function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];

  const { addItem } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  const { data: product, isLoading, isError, refetch } = useProduct(Number(id));
  // In-progress {size, color} selection. A single-variant product collapses and
  // ignores this; multi-variant products resolve once every dimension is chosen.
  const [selection, setSelection] = useState<Selection>({});
  // Brief "Added" confirmation on the CTA after a successful add-to-cart.
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    },
    []
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Ionicons name="cloud-offline-outline" size={40} color={c.muted} />
        <Text className="mt-3 text-center text-base text-muted">
          Couldn&apos;t load this product.
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

  const resolved = resolveVariant(product.variants, selection);
  const showPicker = !resolved.isSingleVariant;

  // Hero image follows the resolved variant (e.g. the chosen color), falling back
  // to the first variant before a selection is made.
  const heroBase = resolved.variant?.imageUrl ?? product.variants[0]?.imageUrl;

  // Price: the chosen variant's price once resolved, otherwise a "from {min}".
  const fromCents = Math.min(...product.variants.map((v) => v.priceCents));

  const ready = resolved.variant != null && resolved.variant.stock > 0;
  const needsChoice =
    (resolved.hasSize && resolved.selectedSize === null) ||
    (resolved.hasColor && resolved.selectedColorName === null);
  const ctaLabel = justAdded
    ? "Added to cart"
    : ready
      ? "Add to cart"
      : needsChoice
        ? "Select options"
        : resolved.variant == null
          ? "Unavailable"
          : "Out of stock";

  function addToCart() {
    const variant = resolved.variant;
    if (!variant || variant.stock <= 0) return;

    addItem({
      variantId: variant.id,
      productId: product!.id,
      name: product!.name,
      size: variant.size,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      unitPriceCents: variant.priceCents,
      imageUrl: variant.imageUrl,
    });

    // Instant feedback: a success haptic plus a transient label change on the CTA.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJustAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1400);
  }

  // The heart wishlists the *displayed* variant (the resolved one, or the first
  // before a multi-variant choice is made) — wishlist rows are variant-keyed,
  // matching cart and orders. The toggle is optimistic (see WishlistContext).
  const wishlistVariant = resolved.variant ?? product.variants[0] ?? null;
  const wishlisted = wishlistVariant
    ? isWishlisted(wishlistVariant.id)
    : false;

  function onToggleWishlist() {
    if (!wishlistVariant) return;
    toggleWishlist({
      variantId: wishlistVariant.id,
      productId: product!.id,
      name: product!.name,
      size: wishlistVariant.size,
      colorName: wishlistVariant.colorName,
      colorHex: wishlistVariant.colorHex,
      priceCents: wishlistVariant.priceCents,
      imageUrl: wishlistVariant.imageUrl,
      inStock: wishlistVariant.stock > 0,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="relative">
          <Image
            source={sizedImage(heroBase, 1080, 80)}
            style={{ width: "100%", aspectRatio: 1 }}
            contentFit="cover"
            transition={200}
          />
          <Pressable
            onPress={onToggleWishlist}
            disabled={!wishlistVariant}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              wishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
            className="absolute right-4 top-4 h-11 w-11 items-center justify-center rounded-full bg-background/80 active:opacity-80"
          >
            <Ionicons
              name={wishlisted ? "heart" : "heart-outline"}
              size={24}
              color={wishlisted ? c.danger : c.accent}
            />
          </Pressable>
        </View>

        <View className="px-5 pt-4">
          <Text className="text-2xl font-bold text-foreground">{product.name}</Text>
          <Text className="mt-1 text-lg font-semibold text-foreground">
            {resolved.variant
              ? formatPrice(resolved.variant.priceCents)
              : `from ${formatPrice(fromCents)}`}
          </Text>

          {!resolved.inStock && (
            <Text className="mt-1 text-sm font-semibold text-danger">
              Currently out of stock
            </Text>
          )}

          {showPicker && resolved.hasColor && (
            <ColorPicker
              colors={resolved.colors}
              selected={resolved.selectedColorName}
              ringColor={c.ring}
              borderColor={c.border}
              onSelect={(name) =>
                setSelection((s) => ({ ...s, colorName: name }))
              }
            />
          )}

          {showPicker && resolved.hasSize && (
            <SizePicker
              sizes={resolved.sizes}
              selected={resolved.selectedSize}
              onSelect={(value) => setSelection((s) => ({ ...s, size: value }))}
            />
          )}

          <Text className="mt-5 text-base leading-6 text-muted">
            {product.description}
          </Text>
        </View>
      </ScrollView>

      <View
        className="border-t border-border bg-background px-5 pb-8 pt-3"
      >
        <Pressable
          disabled={!ready}
          onPress={addToCart}
          className={`items-center rounded-2xl py-4 ${
            justAdded
              ? "bg-success"
              : ready
                ? "bg-primary active:opacity-80"
                : "bg-border"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              justAdded
                ? "text-white"
                : ready
                  ? "text-primary-foreground"
                  : "text-muted"
            }`}
          >
            {ctaLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ColorPicker({
  colors,
  selected,
  ringColor,
  borderColor,
  onSelect,
}: {
  colors: { name: string; hex: string | null; available: boolean }[];
  selected: string | null;
  ringColor: string;
  borderColor: string;
  onSelect: (name: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="text-sm font-semibold text-foreground">
        Color{selected ? `: ${selected}` : ""}
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-3">
        {colors.map((color) => {
          const isSelected = color.name === selected;
          return (
            <Pressable
              key={color.name}
              onPress={() => onSelect(color.name)}
              accessibilityLabel={color.name}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: color.hex ?? "#888888",
                borderWidth: isSelected ? 3 : 1,
                borderColor: isSelected ? ringColor : borderColor,
                opacity: color.available ? 1 : 0.35,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function SizePicker({
  sizes,
  selected,
  onSelect,
}: {
  sizes: { value: string; available: boolean }[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="text-sm font-semibold text-foreground">
        Size{selected ? `: ${selected}` : ""}
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = size.value === selected;
          return (
            <Pressable
              key={size.value}
              onPress={() => onSelect(size.value)}
              className={`min-w-12 items-center rounded-xl border px-4 py-2.5 active:opacity-80 ${
                isSelected
                  ? "border-primary bg-primary"
                  : "border-border bg-card"
              }`}
              style={{ opacity: size.available ? 1 : 0.4 }}
            >
              <Text
                className={`text-sm font-semibold ${
                  isSelected ? "text-primary-foreground" : "text-foreground"
                } ${size.available ? "" : "line-through"}`}
              >
                {size.value}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
