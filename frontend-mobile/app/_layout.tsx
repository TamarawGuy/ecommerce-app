import "../global.css";

import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CartProvider } from "@/src/context/CartContext";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { queryClient } from "@/src/lib/queryClient";

// Completes the OAuth web-browser session when control returns to the app after
// a Google sign-in redirect. Must run at module scope (before any component).
WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — add it to frontend-mobile/.env"
  );
}

export default function RootLayout() {
  return (
    // `tokenCache` persists the Clerk session in the device keychain
    // (expo-secure-store), so the user stays signed in across restarts.
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <CartProvider>
              <SafeAreaProvider>
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  {/* Auth is presented on demand, never a gate — a modal stack
                      pushed over whatever the shopper was doing. */}
                  <Stack.Screen
                    name="(auth)"
                    options={{ presentation: "modal" }}
                  />
                </Stack>
              </SafeAreaProvider>
            </CartProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
