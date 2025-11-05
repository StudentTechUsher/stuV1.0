import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { logError } from '@/lib/logger';
import pLimit from 'p-limit';

export type SchoolRow = {
  name: string;
  website: string | null;
  city: string | null;
  state: string | null;
  registrar_name: string | null;
  registrar_email: string | null;
  registrar_contact_form_url: string | null;
  provost_name: string | null;
  provost_email: string | null;
  provost_contact_form_url: string | null;
  main_office_email: string | null;
  main_office_phone: string | null;
  source_urls: string[];
  notes: string | null;
};

export type ScraperResult = {
  rows: SchoolRow[];
  eta: {
    scrape: number;
    organize: number;
    contacts: number;
    total: number;
  };
  summary: string;
};

type ScrapedSchool = {
  name: string;
  city?: string;
  state?: string;
  website?: string;
  source_url: string;
};

/**
 * AUTHORIZATION: ADMIN
 * Scrapes institutions from seed URLs using Playwright
 */
export async function scrapeInstitutionsPlaywright(
  seedUrls: string[],
): Promise<ScraperResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Stage 1: Scrape seed URLs for institution names
    const stageStartTime = Date.now();
    const schools = await scrapeSeedUrls(context, seedUrls);
    const scrapeTime = Math.round((Date.now() - stageStartTime) / 1000);

    // Stage 2: Organize & deduplicate
    const organizeStartTime = Date.now();
    const uniqueSchools = deduplicateSchools(schools);
    const organizeTime = Math.round((Date.now() - organizeStartTime) / 1000);

    // Stage 3: Discover contact info
    const contactsStartTime = Date.now();
    const schoolRows: SchoolRow[] = [];
    const limit = pLimit(3); // Max 3 concurrent school pages

    const contactPromises = uniqueSchools.map(school =>
      limit(async () => {
        const row = await discoverSchoolContacts(context, school);
        return row;
      }),
    );

    const results = await Promise.allSettled(contactPromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        schoolRows.push(result.value);
      }
    }

    const contactsTime = Math.round((Date.now() - contactsStartTime) / 1000);
    const totalTime = Math.round((Date.now() - startTime) / 1000);

    await context.close();

    return {
      rows: schoolRows,
      eta: {
        scrape: scrapeTime,
        organize: organizeTime,
        contacts: contactsTime,
        total: totalTime,
      },
      summary: `Found ${schoolRows.length} institutions across ${seedUrls.length} sources.`,
    };
  } catch (error) {
    logError('Playwright scraper failed', error, { action: 'playwright_scrape' });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape seed URLs for institution names
 */
async function scrapeSeedUrls(
  context: BrowserContext,
  urls: string[],
): Promise<ScrapedSchool[]> {
  const schools: ScrapedSchool[] = [];
  const limit = pLimit(2); // Max 2 concurrent seed URL requests

  const promises = urls.map(url =>
    limit(async () => {
      try {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const extractedSchools = await extractSchoolNames(page, url);
        schools.push(...extractedSchools);

        await page.close();
      } catch (error) {
        logError(`Failed to scrape seed URL: ${url}`, error, { url });
      }
    }),
  );

  await Promise.allSettled(promises);
  return schools;
}

/**
 * Extract school names from a page (handles tables, links, lists)
 */
async function extractSchoolNames(page: Page, sourceUrl: string): Promise<ScrapedSchool[]> {
  const schools: ScrapedSchool[] = [];

  try {
    // Try to extract from table cells
    const tableCells = await page.$$eval(
      'table td, table th, tr td, tr th',
      (elements) =>
        elements
          .map((el) => ({
            text: el.textContent?.trim() || '',
            href: el.querySelector('a')?.getAttribute('href') || null,
          }))
          .filter((item) => item.text.length > 0),
    );

    // Try to extract from links (especially .edu domains)
    const links = await page.$$eval('a', (elements) =>
      elements
        .map((el) => ({
          text: el.textContent?.trim() || '',
          href: el.getAttribute('href') || '',
        }))
        .filter((item) => item.text.length > 0 && item.href.includes('.edu')),
    );

    // Combine and filter for college/university names
    const candidates = [...tableCells, ...links];
    const collegePattern =
      /\b(college|university|state|polytechnic|academy|institute|school)\b/i;

    for (const candidate of candidates) {
      if (
        collegePattern.test(candidate.text) &&
        candidate.text.length > 5 &&
        candidate.text.length < 150
      ) {
        const existing = schools.find(
          (s) => s.name.toLowerCase() === candidate.text.toLowerCase(),
        );
        if (!existing) {
          schools.push({
            name: candidate.text,
            source_url: sourceUrl,
            website: candidate.href && candidate.href.includes('.edu') ? candidate.href : undefined,
          });
        }
      }
    }

    // Try unordered lists as fallback
    if (schools.length === 0) {
      const listItems = await page.$$eval(
        'li, .list-item, [role="listitem"]',
        (elements) =>
          elements
            .map((el) => el.textContent?.trim() || '')
            .filter((text) => text.length > 0),
      );

      for (const text of listItems) {
        if (collegePattern.test(text) && text.length > 5 && text.length < 150) {
          const existing = schools.find((s) => s.name.toLowerCase() === text.toLowerCase());
          if (!existing) {
            schools.push({
              name: text,
              source_url: sourceUrl,
            });
          }
        }
      }
    }
  } catch (error) {
    logError(`Failed to extract school names from ${sourceUrl}`, error, { sourceUrl });
  }

  return schools;
}

/**
 * Deduplicate schools by name (case-insensitive)
 */
function deduplicateSchools(schools: ScrapedSchool[]): ScrapedSchool[] {
  const seen = new Map<string, ScrapedSchool>();

  for (const school of schools) {
    const key = school.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, school);
    } else {
      // Merge website if found
      const existing = seen.get(key)!;
      if (!existing.website && school.website) {
        existing.website = school.website;
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Discover contact information for a school
 */
async function discoverSchoolContacts(
  context: BrowserContext,
  school: ScrapedSchool,
): Promise<SchoolRow | null> {
  const page = await context.newPage();
  let website: string | null = null;

  try {
    // If website not found in seed URL, search DuckDuckGo
    if (!school.website) {
      website = await searchDuckDuckGo(page, school.name);
    } else {
      website = school.website;
    }

    if (!website) {
      return {
        name: school.name,
        website: null,
        city: school.city || null,
        state: school.state || null,
        registrar_name: null,
        registrar_email: null,
        registrar_contact_form_url: null,
        provost_name: null,
        provost_email: null,
        provost_contact_form_url: null,
        main_office_email: null,
        main_office_phone: null,
        source_urls: [school.source_url],
        notes: 'Unable to locate .edu website',
      };
    }

    // Normalize URL
    if (!website.startsWith('http')) {
      website = `https://${website}`;
    }

    // Visit homepage and contact pages
    const contactInfo = await extractContactInfo(page, website, school.name);

    return {
      name: school.name,
      website: website,
      city: school.city || null,
      state: school.state || null,
      registrar_name: contactInfo.registrar?.name || null,
      registrar_email: contactInfo.registrar?.email || null,
      registrar_contact_form_url: contactInfo.registrar?.url || null,
      provost_name: contactInfo.provost?.name || null,
      provost_email: contactInfo.provost?.email || null,
      provost_contact_form_url: contactInfo.provost?.url || null,
      main_office_email: contactInfo.mainOffice?.email || null,
      main_office_phone: contactInfo.mainOffice?.phone || null,
      source_urls: [school.source_url],
      notes: contactInfo.notes || null,
    };
  } catch (error) {
    logError(`Failed to discover contacts for ${school.name}`, error, {
      school: school.name,
    });

    return {
      name: school.name,
      website: website || null,
      city: school.city || null,
      state: school.state || null,
      registrar_name: null,
      registrar_email: null,
      registrar_contact_form_url: null,
      provost_name: null,
      provost_email: null,
      provost_contact_form_url: null,
      main_office_email: null,
      main_office_phone: null,
      source_urls: [school.source_url],
      notes: 'Error discovering contacts',
    };
  } finally {
    await page.close();
  }
}

/**
 * Search DuckDuckGo for school's .edu website
 */
async function searchDuckDuckGo(page: Page, schoolName: string): Promise<string | null> {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(schoolName)} .edu site:.edu`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Extract first .edu link from results
    const result = await page.$eval('[data-result-type="search"] a', (el) =>
      el.getAttribute('href'),
    ).catch(() => null);

    if (result) {
      // DuckDuckGo redirects through their own domain, so extract the real URL
      const url = new URL(result);
      const uddgUrl = url.searchParams.get('uddg');
      if (uddgUrl) {
        return decodeURIComponent(uddgUrl);
      }
      if (result.includes('.edu')) {
        return result;
      }
    }

    // Fallback: try to construct .edu domain from school name
    const domainMatch = schoolName.match(/^([\w\s]+?)(?:\s(?:University|College|Institute|School))?$/i);
    if (domainMatch) {
      const baseName = domainMatch[1]
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^\w]/g, '');
      return `https://${baseName}.edu`;
    }

    return null;
  } catch (error) {
    logError(`DuckDuckGo search failed for ${schoolName}`, error, {
      schoolName,
    });
    return null;
  }
}

/**
 * Extract contact info (registrar, provost, main office) from school website
 */
async function extractContactInfo(
  page: Page,
  website: string,
  schoolName: string,
): Promise<{
  registrar?: { name?: string; email?: string; url?: string };
  provost?: { name?: string; email?: string; url?: string };
  mainOffice?: { email?: string; phone?: string };
  notes?: string;
}> {
  const contactInfo: any = {};

  const pagesToVisit = [
    { url: website, name: 'homepage' },
    { url: `${website}/contact`, name: 'contact' },
    { url: `${website}/about`, name: 'about' },
    { url: `${website}/registrar`, name: 'registrar' },
    { url: `${website}/provost`, name: 'provost' },
  ];

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const phoneRegex = /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g;
  const allEmails = new Set<string>();
  const allPhones = new Set<string>();

  let pageCount = 0;

  for (const pageInfo of pagesToVisit) {
    if (pageCount >= 3) break; // Limit pages visited per school

    try {
      await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Extract text content
      const content = await page.content();

      // Find emails
      const emailMatches = content.match(emailRegex) || [];
      emailMatches.forEach((email) => {
        if (!email.includes('example.com')) {
          allEmails.add(email.toLowerCase());
        }
      });

      // Find phones
      const phoneMatches = content.match(phoneRegex) || [];
      phoneMatches.forEach((phone) => {
        allPhones.add(phone);
      });

      // Look for registrar/provost mentions in page text
      const pageText = await page.locator('body').textContent();

      if (pageText?.toLowerCase().includes('registrar')) {
        const registrarSection = await page
          .locator('text=/registrar/i')
          .first()
          .boundingBox()
          .catch(() => null);

        if (registrarSection && !contactInfo.registrar) {
          contactInfo.registrar = {
            name: 'Registrar',
            email: extractEmailFromText(pageText, 'registrar'),
            url: pageInfo.url,
          };
        }
      }

      if (pageText?.toLowerCase().includes('provost')) {
        const provostSection = await page
          .locator('text=/provost/i')
          .first()
          .boundingBox()
          .catch(() => null);

        if (provostSection && !contactInfo.provost) {
          contactInfo.provost = {
            name: 'Provost',
            email: extractEmailFromText(pageText, 'provost'),
            url: pageInfo.url,
          };
        }
      }

      pageCount++;
    } catch (error) {
      // Continue to next page on error
    }
  }

  // Assign collected emails and phones
  if (allEmails.size > 0 && !contactInfo.mainOffice) {
    contactInfo.mainOffice = {
      email: Array.from(allEmails)[0],
      phone: allPhones.size > 0 ? Array.from(allPhones)[0] : undefined,
    };
  }

  if (allPhones.size > 0 && contactInfo.mainOffice) {
    contactInfo.mainOffice.phone = Array.from(allPhones)[0];
  }

  return contactInfo;
}

/**
 * Extract email from text near a keyword
 */
function extractEmailFromText(text: string, keyword: string): string | undefined {
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const keywordIndex = text.toLowerCase().indexOf(keyword);

  if (keywordIndex === -1) return undefined;

  // Look for email in 200 characters around keyword
  const searchWindow = text.substring(Math.max(0, keywordIndex - 100), keywordIndex + 200);
  const match = searchWindow.match(emailRegex);

  return match ? match[0] : undefined;
}
