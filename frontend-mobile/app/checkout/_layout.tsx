import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, useColorScheme } from "react-native";

// Full-screen checkout flow, pushed at the root (sibling to the tabs) so the tab
// bar is hidden — the shopper stays focused on address → payment → success.
// Header chrome mirrors the design tokens by scheme (navigation needs raw
// colors, not Tailwind classes) — same approach as the Addresses stack.
const chrome = {
  light: { bg: "#ffffff", text: "#111827" },
  dark: { bg: "#0a0a0a", text: "#f5f5f5" },
};

export default function CheckoutStackLayout() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = chrome[scheme];
  const router = useRouter();

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
      <Stack.Screen
        name="index"
        options={{
          title: "Checkout",
          // `index` is the initial route of this nested stack, so there is no
          // in-stack screen to pop — the push happened on the root (headerless)
          // stack, so we add our own affordance back to the cart.
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="active:opacity-60 pl-1"
            >
              <Ionicons name="chevron-back" size={26} color={c.text} />
            </Pressable>
          ),
        }}
      />
      {/* Success is terminal — no header, no back to payment. */}
      <Stack.Screen name="success" options={{ headerShown: false }} />
    </Stack>
  );
}
