import { expect, test } from '@playwright/test';

test.describe('application shell', () => {
  test('home renders and the console stays clean', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // A page that looks fine with a red console is not a working page.
    expect(errors).toEqual([]);
  });

  test('unknown routes show the not-found page, not a blank screen', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('keyboard users can skip to content', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to be interactive before testing tab order. i18next
    // resolves asynchronously behind a Suspense boundary, and the fallback has
    // no focusable content -- tabbing too early measures the loading state.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Headless Chromium does not route Tab into the document until something
    // inside it holds focus, so start the sequence from <body> explicitly.
    await page.locator('body').press('Tab');

    const skipLink = page.getByRole('link', { name: /skip to content/i });
    await expect(skipLink).toBeFocused();

    // The link must also work, not merely receive focus.
    await skipLink.press('Enter');
    await expect(page.locator('#main')).toBeVisible();
  });
});
