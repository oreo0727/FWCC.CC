import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:8081",
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run server",
      url: "http://localhost:8787/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "EXPO_PUBLIC_CONTENT_URL=http://localhost:8787/v1/content npm --prefix mobile run web -- --port 8081",
      url: "http://localhost:8081",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
