import { defineConfig } from "@playwright/test";

const PORTA = 3100;

/**
 * End-to-end tests: they use the app like a real user, in a real browser.
 *
 * They start their own production server on a separate port and build folder
 * (3100 / .next-e2e): they always begin with the sample data and don't
 * interfere with an open `npm run dev`.
 *
 * Browser: Playwright's Chromium by default (`npx playwright install
 * chromium` once). To use an installed Chrome instead: PW_CHANNEL=chrome.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 6_000 },
  // The tests share the same server (in-memory data) and follow a script:
  // they run in sequence, on a single worker.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "en-US",
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next build && npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { NEXT_DIST_DIR: ".next-e2e" },
  },
});
