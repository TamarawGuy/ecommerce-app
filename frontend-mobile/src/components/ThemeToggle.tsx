import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { useColors } from "@/src/lib/colors";
import type { ThemePreference } from "@/src/lib/theme-storage";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
  { value: "system", label: "System", icon: "phone-portrait-outline" },
];

/**
 * Segmented Light / Dark / System control backed by the persisted theme
 * preference. Works the same for guests and signed-in users — theming is pure
 * client state.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const colors = useColors();

  return (
    <View className="flex-row rounded-xl border border-border bg-card p-1">
      {OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => setPreference(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 ${
              selected ? "bg-primary" : ""
            }`}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={selected ? colors.primaryForeground : colors.muted}
            />
            <Text
              className={`text-sm font-medium ${
                selected ? "text-primary-foreground" : "text-muted"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
