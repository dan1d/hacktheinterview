import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "client/**/*.test.ts", "client/**/*.test.tsx"],
    environmentMatchGlobs: [
      ["client/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      include: ["server/**/*.ts", "client/src/**/*.ts", "client/src/**/*.tsx"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "server/index.ts"],
      reporter: ["text", "text-summary", "lcov"],
    },
  },
});
