import { expect, test } from '@playwright/test';
import { COLOR_MODE_GLOBAL } from '../../lib/theme/dark-mode-contract';
import { assertRootDarkTokenContract, stabilizePage } from '../visual/dark-mode-test-utils';

const storybookUrl = process.env.STORYBOOK_BASE_URL || 'http://127.0.0.1:6006';

type StorybookIndex = {
  entries?: Record<string, { id: string; type?: string }>;
  stories?: Record<string, { id: string; type?: string }>;
};

async function getSampleStoryId(): Promise<string> {
  const response = await fetch(`${storybookUrl}/index.json`);
  if (!response.ok) {
    throw new Error(`Unable to load Storybook index.json (${response.status})`);
  }

  const data = (await response.json()) as StorybookIndex;
  const records = data.entries ?? data.stories ?? {};
  const stories = Object.values(records).filter((entry) => (entry.type ?? 'story') === 'story');
  const preferred = stories.find((entry) => entry.id === 'ui-button--primary');
  const chosen = preferred ?? stories[0];

  if (!chosen) {
    throw new Error('No Storybook stories found in index.json');
  }

  return chosen.id;
}

test('storybook applies dark class, dark color-scheme, and required dark tokens', async ({ page }) => {
  const storyId = await getSampleStoryId();
  const globals = `${COLOR_MODE_GLOBAL}:dark`;
  await page.goto(`${storybookUrl}/iframe.html?id=${storyId}&viewMode=story&globals=${encodeURIComponent(globals)}`);

  await stabilizePage(page);
  await page.waitForLoadState('networkidle');

  await expect.poll(async () => {
    return page.evaluate(() => document.documentElement.classList.contains('dark'));
  }).toBe(true);

  await assertRootDarkTokenContract(page, { expectInlineColorScheme: true });
});
