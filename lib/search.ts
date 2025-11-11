import { Page } from 'playwright';

const DUCKDUCKGO_URL = 'https://duckduckgo.com';
const WAIT_MS = 800;

export async function searchOfficialSite(page: Page, school: string): Promise<string | null> {
  try {
    const query = `${school} site:.edu`;
    const searchUrl = `${DUCKDUCKGO_URL}/?q=${encodeURIComponent(query)}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(WAIT_MS);

    const results = await page.$$eval('[data-result="1"] a', (els) => {
      return els
        .map((el) => {
          const href = el.getAttribute('href');
          return href;
        })
        .filter((href): href is string => !!href && href.includes('.edu'));
    });

    if (results.length > 0) {
      return results[0];
    }

    const fallback = await page.$eval(
      'a[href*=".edu"]',
      (el) => el.getAttribute('href')
    ).catch(() => null);

    return fallback;
  } catch (error) {
    console.error(`Error searching official site for ${school}:`, error);
    return null;
  }
}

export async function searchRolePages(
  page: Page,
  school: string,
  role: 'registrar' | 'provost'
): Promise<string[]> {
  try {
    const query = `${school} ${role} site:.edu`;
    const searchUrl = `${DUCKDUCKGO_URL}/?q=${encodeURIComponent(query)}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(WAIT_MS);

    const results = await page.$$eval('a[href*=".edu"]', (els) => {
      return els
        .map((el) => ({
          href: el.getAttribute('href'),
          text: el.textContent || '',
        }))
        .filter(
          (item) =>
            item.href &&
            item.href.includes('.edu') &&
            (item.text.toLowerCase().includes(role) || item.href.toLowerCase().includes(role))
        )
        .map((item) => item.href)
        .slice(0, 3);
    });

    return [...new Set(results)];
  } catch (error) {
    console.error(`Error searching ${role} pages for ${school}:`, error);
    return [];
  }
}
