import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Unit tests for the logic that decides what people are shown.
 *
 * The search parser, the free-text matcher, the brief scorer and the draft store all
 * shipped without a test runner in the project at all, and every one of them turned out
 * to have a real bug found only by hand. jsdom is here for the draft store, which talks
 * to localStorage; nothing else needs a DOM.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    // The app's own build is the integration test; these cover pure logic only.
    passWithNoTests: false,
  },
});
