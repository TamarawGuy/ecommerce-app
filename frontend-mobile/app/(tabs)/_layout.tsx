import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

import { useCart } from "@/src/context/CartContext";
import { useWishlist } from "@/src/context/WishlistContext";

// Navigation chrome needs raw color values (not Tailwind classes), so we mirror
// the design tokens here and pick by system scheme to stay in sync with theming.
const chrome = {
  light: {
    active: "#111827",
    inactive: "#9ca3af",
    bg: "#ffffff",
    border: "#e5e7eb",
  },
  dark: {
    active: "#f5f5f5",
    inactive: "#6b7280",
    bg: "#0a0a0a",
    border: "#262626",
  },
};

export default function TabsLayout() {
  const scheme = useColorScheme() ?? "light";
  const c = chrome[scheme === "dark" ? "dark" : "light"];
  const { count } = useCart();
  const { items: wishlistItems } = useWishlist();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.active,
        tabBarInactiveTintColor: c.inactive,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.border,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarBadge:
            wishlistItems.length > 0 ? wishlistItems.length : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: count > 0 ? count : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
