import { defineConfig } from "vitest/config";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://venty:venty@localhost:5432/venty_test?schema=public";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: "./tests/global-setup.ts",
    // Alle Test-Files teilen sich eine Datenbank → sequenziell ausführen
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-secret-test-secret-test-secret",
      // großzügig, damit die vielen Test-Registrierungen nicht limitiert werden
      // (der Rate-Limit-Test selbst rechnet mit genau diesem Wert)
      AUTH_RATE_LIMIT_MAX: "30",
    },
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
