import { Stack } from "expo-router";

/**
 * The on-demand auth flow. Presented as a modal from the root (see the root
 * layout), so it floats over browsing/cart and is dismissed by ✕ — it never
 * blocks the rest of the app. Screens push within this stack (sign-in ⇄ sign-up
 * ⇄ reset-password).
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
