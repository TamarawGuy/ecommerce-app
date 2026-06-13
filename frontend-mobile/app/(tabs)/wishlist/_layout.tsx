import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

// Per-tab nested stack: the Wishlist tab lists saved items and pushes product
// detail within this stack so the tab bar stays visible. Header chrome mirrors
// the design tokens by scheme (navigation needs raw colors, not Tailwind classes).
const chrome = {
  light: { bg: "#ffffff", text: "#111827" },
  dark: { bg: "#0a0a0a", text: "#f5f5f5" },
};

export default function WishlistStackLayout() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      {/* The wishlist screen renders its own header. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Title is set dynamically by the detail screen (product name). */}
      <Stack.Screen name="product/[id]" options={{ title: "" }} />
    </Stack>
  );
}
