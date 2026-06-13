import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, useColorScheme } from "react-native";

// Saved-addresses flow, pushed from the Profile tab: a list screen that drills
// into an add/edit form. Header chrome mirrors the design tokens by scheme
// (navigation needs raw colors, not Tailwind classes) — same approach as the
// Categories stack.
const chrome = {
  light: { bg: "#ffffff", text: "#111827" },
  dark: { bg: "#0a0a0a", text: "#f5f5f5" },
};

export default function AddressesStackLayout() {
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
          title: "Saved addresses",
          // `index` is the initial route of this nested stack, so there is no
          // in-stack screen to pop — React Navigation draws no back button. The
          // push happened on the root stack (headerless), so we add our own
          // affordance that pops back to Profile.
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
      {/* Title is set dynamically by the form (Add / Edit address). */}
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
