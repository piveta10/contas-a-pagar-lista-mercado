import { defineConfig, devices } from "@playwright/test";
import { config as carregarEnv } from "dotenv";

carregarEnv({ path: ".env.test", quiet: true });
carregarEnv({ path: ".env.local", quiet: true });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const local = BASE_URL.includes("localhost");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /autenticar\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/estado.json" },
      dependencies: ["setup"],
    },
    {
      name: "celular",
      use: { ...devices["Pixel 7"], storageState: "tests/e2e/.auth/estado.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: local
    ? {
        command: "npm run build && npm run start",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 240_000,
      }
    : undefined,
});
