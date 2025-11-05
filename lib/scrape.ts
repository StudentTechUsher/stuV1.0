import { Page } from 'playwright';

interface ScrapedContent {
  url: string;
  html: string;
  text: string;
}

const urlCache = new Map<string, ScrapedContent>();
const SUBPATHS = ['', '/about', '/contact', '/administration', '/leadership', '/staff', '/directory'];
const WAIT_MS = 600;

function normalizeText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clearUrlCache(): void {
  urlCache.clear();
}

export async function openAndCollect(page: Page, url: string): Promise<ScrapedContent | null> {
  if (urlCache.has(url)) {
    return urlCache.get(url)!;
  }

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(WAIT_MS);

    const html = await page.content();
    const text = normalizeText(html);

    const result: ScrapedContent = { url, html, text };
    urlCache.set(url, result);

    return result;
  } catch (error) {
    console.error(`Error opening ${url}:`, error);
    return null;
  }
}

export async function collectAboutAndContact(
  page: Page,
  website: string | null
): Promise<ScrapedContent[]> {
  if (!website) {
    return [];
  }

  const baseUrl = new URL(website).origin;
  const results: ScrapedContent[] = [];

  for (const subpath of SUBPATHS) {
    const candidateUrl = baseUrl + subpath;
    const content = await openAndCollect(page, candidateUrl);

    if (content) {
      results.push(content);
    }

    await page.waitForTimeout(WAIT_MS);
  }

  return results;
}

export async function collectFromUrls(
  page: Page,
  urls: string[]
): Promise<ScrapedContent[]> {
  const results: ScrapedContent[] = [];

  for (const url of urls) {
    if (!url || !url.startsWith('http')) continue;

    const content = await openAndCollect(page, url);

    if (content) {
      results.push(content);
    }

    await page.waitForTimeout(WAIT_MS);
  }

  return results;
}
