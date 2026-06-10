import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";
import type { CategoryNode } from "@/src/lib/category-tree";

const chrome = {
  light: { muted: "#6b7280", placeholder: "#9ca3af", track: "#d1d5db", accent: "#111827" },
  dark: { muted: "#a3a3a3", placeholder: "#6b7280", track: "#404040", accent: "#f5f5f5" },
};

/** The discovery filters the user can apply. Prices are integer **cents**. */
export interface DiscoveryFilters {
  /** A category at any depth; the screen resolves it to its descendant leaves. */
  categoryId: number | null;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock: boolean;
}

export const EMPTY_FILTERS: DiscoveryFilters = {
  categoryId: null,
  inStock: false,
};

/** True when any filter is set (used to badge the Filter button). */
export function hasActiveFilters(f: DiscoveryFilters): boolean {
  return (
    f.categoryId !== null ||
    f.minPriceCents != null ||
    f.maxPriceCents != null ||
    f.inStock
  );
}

/** Flattens the category tree into indented rows for the picker. */
function flatten(
  nodes: CategoryNode[],
  depth = 0
): { id: number; name: string; depth: number }[] {
  const out: { id: number; name: string; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ id: node.id, name: node.name, depth });
    out.push(...flatten(node.children, depth + 1));
  }
  return out;
}

/** Cents → an editable dollar string (`2499` → `"24.99"`), blank for undefined. */
function centsToInput(cents: number | undefined): string {
  return cents == null ? "" : (cents / 100).toString();
}

/** A dollar string → integer cents, or undefined when blank/invalid/≤ 0. */
function inputToCents(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return undefined;
  const cents = Math.round(dollars * 100);
  return cents > 0 ? cents : undefined;
}

/**
 * The filter sheet: pick a category subtree, a price range, and in-stock-only.
 * Edits are kept in local draft state and only take effect on "Apply" (so
 * dismissing discards them); "Reset" clears every filter.
 */
export function FilterSheet({
  visible,
  tree,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  tree: CategoryNode[];
  value: DiscoveryFilters;
  onApply: (filters: DiscoveryFilters) => void;
  onClose: () => void;
}) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];
  const rows = useMemo(() => flatten(tree), [tree]);

  const [categoryId, setCategoryId] = useState<number | null>(value.categoryId);
  const [minInput, setMinInput] = useState(centsToInput(value.minPriceCents));
  const [maxInput, setMaxInput] = useState(centsToInput(value.maxPriceCents));
  const [inStock, setInStock] = useState(value.inStock);

  // Re-sync the draft from the applied filters each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setCategoryId(value.categoryId);
      setMinInput(centsToInput(value.minPriceCents));
      setMaxInput(centsToInput(value.maxPriceCents));
      setInStock(value.inStock);
    }
  }, [visible, value]);

  function apply() {
    onApply({
      categoryId,
      minPriceCents: inputToCents(minInput),
      maxPriceCents: inputToCents(maxInput),
      inStock,
    });
    onClose();
  }

  function reset() {
    setCategoryId(null);
    setMinInput("");
    setMaxInput("");
    setInStock(false);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-2 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Filters</Text>
          <Pressable onPress={reset} hitSlop={8} className="active:opacity-60">
            <Text className="text-sm font-semibold text-muted">Reset</Text>
          </Pressable>
        </View>

        {/* Category subtree */}
        <Text className="mt-5 text-sm font-semibold text-foreground">Category</Text>
        <ScrollView
          style={{ maxHeight: 220 }}
          className="mt-2 rounded-xl border border-border"
          keyboardShouldPersistTaps="handled"
        >
          <CategoryRow
            label="All categories"
            depth={0}
            selected={categoryId === null}
            accent={c.accent}
            onPress={() => setCategoryId(null)}
          />
          {rows.map((row) => (
            <CategoryRow
              key={row.id}
              label={row.name}
              depth={row.depth}
              selected={categoryId === row.id}
              accent={c.accent}
              onPress={() => setCategoryId(row.id)}
            />
          ))}
        </ScrollView>

        {/* Price range */}
        <Text className="mt-5 text-sm font-semibold text-foreground">
          Price range
        </Text>
        <View className="mt-2 flex-row items-center gap-3">
          <PriceInput
            value={minInput}
            onChangeText={setMinInput}
            placeholder="Min"
            placeholderColor={c.placeholder}
          />
          <Text className="text-muted">–</Text>
          <PriceInput
            value={maxInput}
            onChangeText={setMaxInput}
            placeholder="Max"
            placeholderColor={c.placeholder}
          />
        </View>

        {/* In stock only */}
        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-foreground">
            In stock only
          </Text>
          <Switch
            value={inStock}
            onValueChange={setInStock}
            trackColor={{ true: c.accent, false: c.track }}
          />
        </View>

        <Pressable
          onPress={apply}
          className="mt-6 items-center rounded-2xl bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-primary-foreground">
            Apply filters
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function CategoryRow({
  label,
  depth,
  selected,
  accent,
  onPress,
}: {
  label: string;
  depth: number;
  selected: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingLeft: 12 + depth * 16 }}
      className="flex-row items-center justify-between py-2.5 pr-3 active:opacity-60"
    >
      <Text
        className={`text-base ${
          selected ? "font-semibold text-foreground" : "text-muted"
        }`}
      >
        {label}
      </Text>
      {selected && <Ionicons name="checkmark" size={18} color={accent} />}
    </Pressable>
  );
}

function PriceInput({
  value,
  onChangeText,
  placeholder,
  placeholderColor,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderColor: string;
}) {
  return (
    <View className="flex-1 flex-row items-center rounded-xl border border-border bg-card px-3 py-2.5">
      <Text className="text-base text-muted">$</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        keyboardType="decimal-pad"
        className="ml-1 flex-1 p-0 text-base text-foreground"
      />
    </View>
  );
}
