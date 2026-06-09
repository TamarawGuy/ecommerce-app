import { defineConfig } from "vitest/config";

// Unit tests run in a plain Node environment and live next to the code they
// cover (`*.test.ts`). Transactional modules will add integration tests against
// a disposable test database in a later slice.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
