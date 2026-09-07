import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3031",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    channel: process.env.CI ? undefined : "msedge",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3031",
    url: "http://127.0.0.1:3031",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
