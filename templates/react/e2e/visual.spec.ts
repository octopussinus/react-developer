import { expect, test } from '@playwright/test';

/**
 * Visual regression. Tagged @visual so it runs via `npm run visual`, not in the
 * main e2e pass.
 *
 * Why it earns its place: this is the only automated check that catches "the
 * agent silently changed the spacing on 40 cards". A PR comment showing exactly
 * which pixels moved is the most reviewable artifact you can hand a human.
 *
 * Baselines are PLATFORM-SPECIFIC -- font rendering differs between macOS,
 * Windows and Linux. The committed baselines are Linux (matching CI). Update
 * them with `npm run visual:update`, and only from the same platform CI uses,
 * or every diff will be noise.
 */

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/does-not-exist', name: 'not-found' },
];

for (const route of ROUTES) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${route.name} (${scheme}) matches its baseline @visual`, async ({ page }) => {
      await page.goto(route.path);

      // Wait for the app, not the i18n Suspense fallback -- the same mistake
      // that made the a11y gate inert would make every baseline a spinner.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Dark mode is the `.dark` class, not a media query -- emulateMedia would
      // only move the OS preference, which 'system' may not even follow.
      await page.evaluate((mode) => {
        document.documentElement.classList.toggle('dark', mode === 'dark');
      }, scheme);

      // The dev-only feedback toolbar is not product UI; hide it so it cannot
      // cause a diff.
      await page.addStyleTag({ content: '#react-dev-feedback { display: none !important; }' });

      await expect(page).toHaveScreenshot(`${route.name}-${scheme}.png`, {
        fullPage: true,
        animations: 'disabled',
        // Small tolerance for antialiasing; large enough changes still fail.
        maxDiffPixelRatio: 0.01,
      });
    });
  }
}
