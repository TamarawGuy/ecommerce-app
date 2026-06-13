import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Pre-warms the Android Custom Tab so the OAuth browser opens instantly when the
 * user taps "Continue with Google". A no-op on iOS (which uses its own session
 * UI). Clerk recommends this on every screen that starts an SSO flow.
 */
export function useWarmUpBrowser(): void {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
