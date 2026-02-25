import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, Page } from '@playwright/test';
import { REQUIRED_DARK_TOKENS } from '../../lib/theme/dark-mode-contract';

export const VISUAL_VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

export type VisualDiffFailure = {
  id: string;
  viewport: string;
  ratio: number | null;
  message: string;
};

export async function stabilizePage(page: Page): Promise<void> {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
    `,
  });
}

export function parseDiffRatio(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const ratioMatch = error.message.match(/ratio\s+([0-9.]+)\s+of all image pixels/i);
  if (ratioMatch) {
    return Number(ratioMatch[1]);
  }

  return null;
}

export function normalizeTokenValue(value: string): string {
  return value.trim().toLowerCase();
}

export async function assertRootDarkTokenContract(
  page: Page,
  options: { expectInlineColorScheme?: boolean } = {}
): Promise<void> {
  const { expectInlineColorScheme = false } = options;
  const values = await page.evaluate((tokenNames) => {
    const html = document.documentElement;
    const style = getComputedStyle(html);
    const result: Record<string, string> = {};

    tokenNames.forEach((token) => {
      result[token] = style.getPropertyValue(token);
    });

    return {
      htmlClassList: Array.from(html.classList),
      colorScheme: html.style.colorScheme,
      forceLightLanding: html.dataset.forceLightLanding === 'true',
      values: result,
    };
  }, Object.keys(REQUIRED_DARK_TOKENS));

  if (values.forceLightLanding) {
    return;
  }

  expect(values.htmlClassList).toContain('dark');
  if (expectInlineColorScheme) {
    expect(values.colorScheme).toBe('dark');
  }

  for (const [token, expected] of Object.entries(REQUIRED_DARK_TOKENS)) {
    expect(normalizeTokenValue(values.values[token])).toBe(normalizeTokenValue(expected));
  }
}

export async function writeSummaryFile(fileName: string, content: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'test-results', 'dark-mode');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);
  await fs.writeFile(outputPath, content, 'utf8');
  return outputPath;
}
