// Some React Native APIs (TextInput cursor/placeholder, icons, Lottie, status
// bar) need raw color values, not Tailwind classes. This mirrors the design
// tokens from `global.css` so those props stay in sync with the themed classes.
// Several existing screens inline this same map; new code shares it via `useColors`.

import { useColorScheme } from "react-native";

export const palette = {
  light: {
    background: "#ffffff",
    foreground: "#111827",
    card: "#f9fafb",
    muted: "#6b7280",
    border: "#e5e7eb",
    primary: "#111827",
    primaryForeground: "#ffffff",
    success: "#16a34a",
    danger: "#dc2626",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#f5f5f5",
    card: "#171717",
    muted: "#a3a3a3",
    border: "#262626",
    primary: "#f5f5f5",
    primaryForeground: "#0a0a0a",
    success: "#22c55e",
    danger: "#f87171",
  },
} as const;

export type Palette = Record<keyof (typeof palette)["light"], string>;

/**
 * The active palette, following the current color scheme. Because the manual
 * theme override drives React Native's `Appearance` (via NativeWind's
 * `setColorScheme`), this hook reflects the override too — not just the system
 * setting.
 */
export function useColors(): Palette {
  return palette[useColorScheme() === "dark" ? "dark" : "light"];
}
