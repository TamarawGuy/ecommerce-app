import "../global.css";

import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CartProvider } from "@/src/context/CartContext";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { WishlistProvider } from "@/src/context/WishlistContext";
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

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY — add it to frontend-mobile/.env"
  );
}

export default function RootLayout() {
  return (
    // `tokenCache` persists the Clerk session in the device keychain
    // (expo-secure-store), so the user stays signed in across restarts.
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {/* Non-null asserted: the module-level guard above throws if it's unset,
          but TS doesn't carry that narrowing into this component closure. */}
      <StripeProvider publishableKey={stripePublishableKey!}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <CartProvider>
                <WishlistProvider>
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
                      {/* Saved-addresses flow, pushed from the Profile tab. Its
                          own stack renders the header (list + add/edit form). */}
                      <Stack.Screen name="addresses" />
                      {/* Order-history flow, pushed from the Profile tab. Its
                          own stack renders the header (the list screen). */}
                      <Stack.Screen name="orders" />
                      {/* Full-screen checkout (address → payment → success),
                          pushed from the cart. Its own stack; no tab bar. */}
                      <Stack.Screen name="checkout" />
                    </Stack>
                  </SafeAreaProvider>
                </WishlistProvider>
              </CartProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </StripeProvider>
    </ClerkProvider>
  );
}
