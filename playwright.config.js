import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4179",
    browserName: "chromium",
    channel: process.env.PW_TEST_CHANNEL || "chromium",
    headless: true,
    launchOptions: {
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--disable-audio-input",
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --port 4179 --strictPort",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
  },
});
