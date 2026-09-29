import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts", "services/**/__tests__/**/*.test.ts"],
    // The demo libraries under test are pure by design: no database, no env, no I/O.
    // If a suite ever needs a real database it belongs in scripts/, not here.
    globals: false,
    coverage: {
      provider: "v8",
      // Only the pure modules are held to a coverage bar. The server-only ones
      // (enforce, events, transition, scope) need a live database to exercise, so
      // counting them would only reward untested code being left out.
      include: [
        "lib/demo/constants.ts",
        "lib/demo/lifecycle.ts",
        "lib/demo/limits.ts",
        "lib/demo/plans.ts",
        "lib/demo/slug.ts",
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
})
