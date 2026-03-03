import { expect, test } from '@playwright/test';
import {
  COLOR_MODE_GLOBAL,
} from '../../lib/theme/dark-mode-contract';
import {
  VISUAL_VIEWPORTS,
  parseDiffRatio,
  stabilizePage,
  writeSummaryFile,
  type VisualDiffFailure,
} from './dark-mode-test-utils';

const storybookUrl = process.env.STORYBOOK_BASE_URL || 'http://127.0.0.1:6006';

type StoryRecord = {
  id: string;
  title?: string;
  name?: string;
  type?: string;
};

type StorybookIndex = {
  entries?: Record<string, StoryRecord>;
  stories?: Record<string, StoryRecord>;
};

async function getAllStories(): Promise<StoryRecord[]> {
  const response = await fetch(`${storybookUrl}/index.json`);
  if (!response.ok) {
    throw new Error(`Unable to load Storybook index.json (${response.status})`);
  }

  const data = (await response.json()) as StorybookIndex;
  const records = Object.values(data.entries ?? data.stories ?? {});
  return records.filter((entry) => (entry.type ?? 'story') === 'story');
}

function escapeSnapshotSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '-');
}

test.describe('dark-mode visual regression for all Storybook stories', () => {
  test('captures dark snapshots for every story and records drift summary', async ({ page }) => {
    const stories = await getAllStories();
    const failures: VisualDiffFailure[] = [];

    expect(stories.length).toBeGreaterThan(0);

    for (const story of stories) {
      const globals = `${COLOR_MODE_GLOBAL}:dark`;
      const url = `${storybookUrl}/iframe.html?id=${story.id}&viewMode=story&globals=${encodeURIComponent(globals)}`;

      for (const viewport of VISUAL_VIEWPORTS) {
        await test.step(`${story.id} (${viewport.name})`, async () => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          await stabilizePage(page);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(200);

          const snapshotName = `storybook-dark/${escapeSnapshotSegment(story.id)}.dark.${viewport.name}`;

          try {
            await expect(page).toHaveScreenshot(snapshotName, {
              fullPage: true,
              animations: 'disabled',
              maxDiffPixelRatio: 0.005,
            });
          } catch (error) {
            failures.push({
              id: story.id,
              viewport: viewport.name,
              ratio: parseDiffRatio(error),
              message: error instanceof Error ? error.message.split('\n')[0] : 'Unknown screenshot mismatch',
            });
          }
        });
      }
    }

    const summaryPayload = {
      checkedStories: stories.length,
      checkedSnapshots: stories.length * VISUAL_VIEWPORTS.length,
      failedSnapshots: failures.length,
      failed: failures,
    };

    const jsonSummary = JSON.stringify(summaryPayload, null, 2);
    await writeSummaryFile('storybook-diff-summary.json', jsonSummary);

    const markdownSummary = [
      '# Dark Mode Storybook Diff Summary',
      '',
      `- Stories checked: ${summaryPayload.checkedStories}`,
      `- Snapshots checked: ${summaryPayload.checkedSnapshots}`,
      `- Failed snapshots: ${summaryPayload.failedSnapshots}`,
      '',
      ...(failures.length === 0
        ? ['No visual diffs detected.']
        : failures.map((failure) => {
          const ratioText = failure.ratio === null ? 'n/a' : `${(failure.ratio * 100).toFixed(3)}%`;
          return `- ${failure.id} [${failure.viewport}] diff ratio: ${ratioText}`;
        })),
    ].join('\n');

    await writeSummaryFile('storybook-diff-summary.md', markdownSummary);
    expect(failures, markdownSummary).toEqual([]);
  });
});
