import { expect, test } from '@playwright/test';
import { DARK_MODE_STORAGE_KEY } from '../../lib/theme/dark-mode-contract';
import { assertRootDarkTokenContract, stabilizePage } from '../visual/dark-mode-test-utils';

const CORE_ROUTES = ['/login', '/services', '/how-it-works'];

test.describe('app dark mode contract', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(([storageKey]) => {
      localStorage.setItem(storageKey, 'dark');
    }, [DARK_MODE_STORAGE_KEY]);

    await stabilizePage(page);
  });

  for (const route of CORE_ROUTES) {
    test(`applies dark contract on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      const forceLightLanding = await page.evaluate(() => document.documentElement.dataset.forceLightLanding === 'true');
      test.skip(forceLightLanding, `${route} intentionally forces light mode via data-force-light-landing`);

      await expect.poll(async () => {
        return page.evaluate(() => document.documentElement.classList.contains('dark'));
      }).toBe(true);

      await assertRootDarkTokenContract(page);
    });
  }
});
