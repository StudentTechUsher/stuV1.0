import { expect, test } from '@playwright/test';
import { DARK_MODE_STORAGE_KEY } from '../../lib/theme/dark-mode-contract';
import {
  VISUAL_VIEWPORTS,
  assertRootDarkTokenContract,
  stabilizePage,
  writeSummaryFile,
} from './dark-mode-test-utils';
import { DARK_MODE_ROUTE_MANIFEST } from './dark-mode-route-manifest';

type RouteResult = {
  id: string;
  route: string;
  finalPath: string;
  skippedAuth: boolean;
  forcedLight: boolean;
};

function escapeSnapshotSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '-');
}

test.describe('app dark-mode route parity', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(([storageKey]) => {
      localStorage.setItem(storageKey, 'dark');
    }, [DARK_MODE_STORAGE_KEY]);

    await stabilizePage(page);
  });

  test('captures dark-mode route and region snapshots from manifest', async ({ page }) => {
    const results: RouteResult[] = [];

    for (const target of DARK_MODE_ROUTE_MANIFEST) {
      for (const viewport of VISUAL_VIEWPORTS) {
        await test.step(`${target.id} (${viewport.name})`, async () => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(target.route, { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(200);

          const finalPath = new URL(page.url()).pathname;
          const redirectedToLogin = finalPath === '/login' && target.route !== '/login';
          const forceLightLanding = await page.evaluate(() => document.documentElement.dataset.forceLightLanding === 'true');
          const skipForAuth = Boolean(target.allowAuthRedirect && redirectedToLogin);

          results.push({
            id: `${target.id}:${viewport.name}`,
            route: target.route,
            finalPath,
            skippedAuth: skipForAuth,
            forcedLight: forceLightLanding,
          });

          if (skipForAuth || forceLightLanding) {
            return;
          }

          if (target.expectDarkClass) {
            await expect.poll(async () => {
              return page.evaluate(() => document.documentElement.classList.contains('dark'));
            }).toBe(true);
            await assertRootDarkTokenContract(page);
          }

          await expect(page).toHaveScreenshot(
            `app-dark/${escapeSnapshotSegment(target.id)}.route.dark.${viewport.name}`,
            {
              fullPage: true,
              animations: 'disabled',
              maxDiffPixelRatio: 0.01,
            }
          );

          for (const selector of target.selectors) {
            const locator = page.locator(selector).first();
            if (await locator.count() === 0) {
              continue;
            }
            await expect(locator).toBeVisible();
            await expect(locator).toHaveScreenshot(
              `app-dark/${escapeSnapshotSegment(target.id)}.${escapeSnapshotSegment(selector)}.dark.${viewport.name}`,
              {
                animations: 'disabled',
                maxDiffPixelRatio: 0.01,
              }
            );
          }
        });
      }
    }

    const skippedAuth = results.filter((result) => result.skippedAuth).length;
    const forcedLight = results.filter((result) => result.forcedLight).length;
    const markdownSummary = [
      '# Dark Mode App Route Summary',
      '',
      `- Manifest routes: ${DARK_MODE_ROUTE_MANIFEST.length}`,
      `- Viewport checks: ${results.length}`,
      `- Auth-redirect skips: ${skippedAuth}`,
      `- Forced-light skips: ${forcedLight}`,
      '',
      '## Route Results',
      ...results.map((result) => {
        const tags = [
          result.skippedAuth ? 'auth-skip' : 'checked',
          result.forcedLight ? 'forced-light' : 'dark-expected',
        ];
        return `- ${result.id} (${result.route} -> ${result.finalPath}) [${tags.join(', ')}]`;
      }),
    ].join('\n');

    await writeSummaryFile('app-route-summary.md', markdownSummary);
  });
});
