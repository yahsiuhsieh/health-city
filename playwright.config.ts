import { defineConfig, devices } from "@playwright/test";

// Start the local app separately. Tests never start a server or use production.
const baseURL = "http://127.0.0.1:8787";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
});
