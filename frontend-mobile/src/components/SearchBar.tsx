import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, useColorScheme, View } from "react-native";

const chrome = {
  light: { muted: "#6b7280", placeholder: "#9ca3af" },
  dark: { muted: "#a3a3a3", placeholder: "#6b7280" },
};

/**
 * The discovery search field. Controlled by the caller (which debounces the
 * value before querying); shows a clear button once there's text.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search products",
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];

  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-3">
      <Ionicons name="search" size={18} color={c.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        className="flex-1"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}
