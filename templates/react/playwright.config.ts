import { defineConfig } from '@playwright/test';
// @ts-expect-error -- plain .mjs helper, no types needed
import { devUrl } from './tools/dev-port.mjs';

/*
 * The dev server URL is derived from THIS checkout, not hardcoded. Two worktrees
 * on a fixed port plus `reuseExistingServer` means the second one silently runs
 * its whole suite against the first one's code -- passing, and proving nothing.
 */
const url = devUrl();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL: url,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  /*
   * The three widths the review bar names (375 / 768 / 1440), all on Chromium.
   *
   * Deliberately NOT device descriptors: devices['iPad Mini'] carries
   * defaultBrowserType 'webkit', so it fails unless webkit is also installed,
   * and devices['Pixel 7'] is 412px rather than the 375 the bar specifies.
   * These projects test LAYOUT, not browser engines -- to add a real engine,
   * install it and add a project with an explicit browserName.
   */
  projects: [
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url,
    /*
     * Opt-IN rather than opt-out. Reusing a server is a convenience worth
     * seconds; reusing the WRONG one costs you a green run on code you never
     * executed. Set PW_REUSE_SERVER=1 when you knowingly have one running.
     */
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120_000,
  },
});
