import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useColors } from "@/src/lib/colors";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** Shows a spinner and blocks taps — use while an async action is in flight. */
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

const container: Record<Variant, string> = {
  primary: "bg-primary",
  secondary: "border border-border bg-card",
  ghost: "",
};
const labelColor: Record<Variant, string> = {
  primary: "text-primary-foreground",
  secondary: "text-foreground",
  ghost: "text-foreground",
};

/**
 * The app's primary action button. One component for the three weights used
 * across auth and profile (filled, outlined, text-only) so spacing, radius, and
 * the pressed/disabled/loading states stay consistent everywhere.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
}: ButtonProps) {
  const colors = useColors();
  const inactive = disabled || loading;
  const spinnerColor =
    variant === "primary" ? colors.primaryForeground : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`flex-row items-center justify-center gap-2 rounded-2xl px-5 py-4 active:opacity-80 ${
        container[variant]
      } ${inactive ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={
                variant === "primary"
                  ? colors.primaryForeground
                  : colors.foreground
              }
            />
          )}
          <Text className={`text-base font-semibold ${labelColor[variant]}`}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
