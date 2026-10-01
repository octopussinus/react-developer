import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
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
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
