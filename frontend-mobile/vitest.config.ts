import { defineConfig } from "vitest/config";

// Unit tests for the pure client modules (cart reducer, persistence) run in a
// plain Node environment and live next to the code they cover (`*.test.ts`).
// React Native screens are exercised manually, not here; we mock the native
// AsyncStorage module in the persistence tests rather than load it for real.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
