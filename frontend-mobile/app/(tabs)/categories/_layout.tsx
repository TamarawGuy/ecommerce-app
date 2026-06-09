import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

// Per-tab nested stack: the Categories tab drills department → sub-type → leaf,
// pushing a screen per level. Header chrome mirrors the design tokens by scheme
// (navigation needs raw colors, not Tailwind classes).
const chrome = {
  light: { bg: "#ffffff", text: "#111827" },
  dark: { bg: "#0a0a0a", text: "#f5f5f5" },
};

export default function CategoriesStackLayout() {
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
      }}
    >
      <Stack.Screen name="index" options={{ title: "Categories" }} />
      {/* Title is set dynamically by the screen from the category name. */}
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
