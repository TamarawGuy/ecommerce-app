import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, useColorScheme, View } from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";
import type { ProductSort } from "@/src/hooks/useProducts";

const chrome = {
  light: { accent: "#111827" },
  dark: { accent: "#f5f5f5" },
};

/** The selectable sort orders, in display order, with human labels. */
export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function sortLabel(sort: ProductSort): string {
  return SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Featured";
}

/** A bottom-sheet menu for choosing the product sort order. */
export function SortMenu({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: ProductSort;
  onSelect: (sort: ProductSort) => void;
  onClose: () => void;
}) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-lg font-bold text-foreground">Sort by</Text>
        <View className="mt-2">
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className="flex-row items-center justify-between py-3.5 active:opacity-60"
              >
                <Text
                  className={`text-base ${
                    isSelected
                      ? "font-semibold text-foreground"
                      : "text-muted"
                  }`}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={c.accent} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}
