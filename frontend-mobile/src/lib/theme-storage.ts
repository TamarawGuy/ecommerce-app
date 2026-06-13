// Persists the user's manual theme choice so it survives restarts. Mirrors the
// cart's "a bad read degrades gracefully" approach — theming is never load-
// bearing, so any failure falls back to following the system.

import AsyncStorage from "@react-native-async-storage/async-storage";

/** "system" follows the device; "light"/"dark" force a scheme. */
export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "vibe.theme.v1";

function isPreference(v: string | null): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return isPreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Ignore — the preference still applies for this session.
  }
}
