// Manual light/dark override that persists and works for guests (it's pure
// client state, no account needed). NativeWind's `setColorScheme` drives both
// the `dark:`/token CSS and React Native's `Appearance`, so a manual choice
// flips the design tokens *and* every `useColorScheme()` consumer (tab bar,
// icons) in one call. We track the *preference* separately because NativeWind
// only exposes the resolved scheme, not whether the user picked "system".

import { useColorScheme } from "nativewind";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "@/src/lib/theme-storage";

interface ThemeContextValue {
  /** What the user chose: "light", "dark", or "system". */
  preference: ThemePreference;
  /** The scheme actually in effect right now ("system" resolved to one). */
  resolved: "light" | "dark";
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  // Apply the saved preference once on launch. Until this runs, NativeWind
  // follows the system default, so the worst case is a brief flash if the saved
  // choice differs from the device — acceptable for a non-critical setting.
  useEffect(() => {
    let active = true;
    loadThemePreference().then((pref) => {
      if (!active) return;
      setPreferenceState(pref);
      setColorScheme(pref);
    });
    return () => {
      active = false;
    };
  }, [setColorScheme]);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    setColorScheme(pref);
    void saveThemePreference(pref);
  };

  const value: ThemeContextValue = {
    preference,
    resolved: colorScheme === "dark" ? "dark" : "light",
    setPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the theme preference. Throws if used outside <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
