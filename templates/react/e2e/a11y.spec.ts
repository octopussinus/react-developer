import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Tagged @a11y so `npm run a11y` runs these and `npm run e2e` does not.
 * The merge bar is zero critical and zero serious violations; moderate ones are
 * reported, never silenced.
 *
 * Add every new route here. An unscanned route is an unchecked route.
 */
const ROUTES = ['/'];

for (const route of ROUTES) {
  test(`${route} has no critical or serious accessibility violations @a11y`, async ({ page }) => {
    await page.goto(route);

    // CRITICAL: wait for the app to actually render before scanning.
    // i18next resolves asynchronously behind a Suspense boundary, so scanning
    // straight after goto analyses the loading spinner -- which is always
    // clean, making this gate silently inert. A scan that cannot fail is worse
    // than no scan, because it reads as a passing check.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );

    expect(
      blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`),
      'axe found blocking violations',
    ).toEqual([]);
  });
}
