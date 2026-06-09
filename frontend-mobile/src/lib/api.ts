import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolves the backend base URL.
 * Priority:
 *  1. EXPO_PUBLIC_API_URL if explicitly set.
 *  2. The Metro dev-server host (the machine running `expo start`) on port 4000 —
 *     this is what makes it work on a physical device over LAN.
 *  3. Platform fallback (Android emulator uses 10.0.2.2 for the host loopback).
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? undefined;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:4000`;

  return Platform.OS === "android"
    ? "http://10.0.2.2:4000"
    : "http://localhost:4000";
}

export const API_BASE_URL = resolveBaseUrl();

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  return (await res.json()) as T;
}
