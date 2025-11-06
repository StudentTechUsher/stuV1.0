'use server';

/**
 * Web Scraper Service
 *
 * Autonomous web research + data extraction agent for U.S. colleges/universities.
 * Scrapes webpages, normalizes institution data, classifies into categories,
 * and discovers contact information.
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface InstitutionRow {
  name: string;
  aka: string[] | null;
  website: string | null;
  city: string | null;
  state: string | null;
  sector: 'Public' | 'Private' | 'For-Profit' | null;
  control: 'Nonprofit' | 'For-Profit' | null;
  category:
    | 'Elite Private University'
    | 'Large Private/Public University'
    | 'Mid-Tier State University'
    | 'Community College/Junior College'
    | 'For-Profit/Technical College'
    | 'Small Private Non-Profits';
  classification_confidence: number;
  classification_rationale: string;
  enrollment_estimate: string | null;
  systems_signals: string[] | null;
  stu_fit_score: number;
  fit_rationale: string;
  registrar_name: string | null;
  registrar_email: string | null;
  registrar_contact_form_url: string | null;
  provost_name: string | null;
  provost_email: string | null;
  provost_contact_form_url: string | null;
  main_office_phone: string | null;
  main_office_email: string | null;
  source_urls: string[];
  notes: string | null;
}

export interface ScraperResult {
  table_markdown: string;
  rows: InstitutionRow[];
  eta: {
    scrape: number;
    organize: number;
    search: number;
    contacts: number;
    total: number;
  };
  xlsx_base64: string | null;
  summary: string;
}

interface ScrapedInstitution {
  name: string;
  aka: Set<string>;
  website: string | null;
  city: string | null;
  state: string | null;
  sector: 'Public' | 'Private' | 'For-Profit' | null;
  source_urls: Set<string>;
}

// ============================================================================
// CONSTANTS & HEURISTICS
// ============================================================================

const COMMUNITY_COLLEGE_PATTERNS = [
  /community\s+college/i,
  /junior\s+college/i,
  /cc\b/i,
  /\bCC\b/,
];

const FOR_PROFIT_PATTERNS = [
  /for-profit/i,
  /for profit/i,
  /university\s+of\s+phoenix/i,
  /kaplan\s+university/i,
  /strayer\s+university/i,
  /career\s+college/i,
  /technical\s+institute/i,
];

const ELITE_PRIVATE_KEYWORDS = [
  'harvard',
  'yale',
  'princeton',
  'stanford',
  'mit',
  'caltech',
  'duke',
  'chicago',
  'northwestern',
  'rice',
  'vanderbilt',
  'notre dame',
  'johns hopkins',
  'washingon university',
  'carnegie mellon',
  'penn',
];

const SYSTEMS_SIGNALS = ['banner', 'degree works', 'degreeworks', 'stellic', 'civitas', 'colleague'];

const STATE_CODES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

// ============================================================================
// CORE SCRAPING FUNCTIONS
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Fetches a URL with retry logic and rate limiting
 * @param url - The URL to fetch
 * @param retries - Number of retries on failure
 * @returns HTML content or null if failed
 */
async function fetchUrl(url: string, retries = 2): Promise<string | null> {
  const userAgent =
    'Mozilla/5.0 (compatible; stuResearchBot/1.0; +https://stu.education/scraper)';

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(url, {
        headers: { 'User-Agent': userAgent },
        timeout: 25000,
      } as any);

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - exponential backoff
          const backoff = Math.pow(2, i) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        return null;
      }

      return await response.text();
    } catch (error) {
      if (i === retries) {
        console.error(`Failed to fetch ${url}:`, error);
        return null;
      }
      // Exponential backoff with jitter
      const backoff = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  return null;
}

/**
 * AUTHORIZATION: PUBLIC
 * Parses HTML and extracts institution information
 * @param html - HTML content
 * @param sourceUrl - URL where content came from
 * @returns Array of found institutions
 */
function parseInstitutionsFromHtml(html: string, sourceUrl: string): ScrapedInstitution[] {
  const $ = cheerio.load(html);
  const institutions: ScrapedInstitution[] = [];

  // Try to find links to .edu domains (common institution URLs)
  $('a[href*=".edu"]').each((_i, elem) => {
    const href = $(elem).attr('href') || '';
    const text = $(elem).text().trim();

    if (text && href.includes('.edu')) {
      institutions.push({
        name: text,
        aka: new Set(),
        website: href.startsWith('http') ? href : `https://${href}`,
        city: null,
        state: null,
        sector: null,
        source_urls: new Set([sourceUrl]),
      });
    }
  });

  // Extract table data (common for college lists)
  $('table tbody tr').each((_i, elem) => {
    const cells = $(elem).find('td');
    if (cells.length >= 1) {
      const institutionName = $(cells[0]).text().trim();
      if (institutionName && institutionName.length > 3) {
        let website = null;
        let city = null;
        let state = null;

        if (cells.length >= 2) {
          const cityState = $(cells[1]).text().trim();
          const match = cityState.match(/(.+),\s*([A-Z]{2})/);
          if (match) {
            city = match[1].trim();
            state = match[2];
          }
        }

        if (cells.length >= 3) {
          const link = $(cells[2]).find('a');
          if (link.length) {
            website = link.attr('href') || null;
          }
        }

        institutions.push({
          name: institutionName,
          aka: new Set(),
          website,
          city,
          state,
          sector: null,
          source_urls: new Set([sourceUrl]),
        });
      }
    }
  });

  return institutions;
}

// ============================================================================
// CLASSIFICATION & NORMALIZATION
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Classifies institution into one of six buckets
 * @param institution - Institution data
 * @returns Category and confidence score
 */
function classifyInstitution(
  institution: ScrapedInstitution
): { category: InstitutionRow['category']; confidence: number; rationale: string } {
  const name = institution.name.toLowerCase();

  // Rule 1: Community College/Junior College
  for (const pattern of COMMUNITY_COLLEGE_PATTERNS) {
    if (pattern.test(name)) {
      return {
        category: 'Community College/Junior College',
        confidence: 0.95,
        rationale: 'Matched community/junior college naming pattern.',
      };
    }
  }

  // Rule 2: For-Profit/Technical College
  for (const pattern of FOR_PROFIT_PATTERNS) {
    if (pattern.test(name)) {
      return {
        category: 'For-Profit/Technical College',
        confidence: 0.9,
        rationale: 'Matched for-profit or technical naming pattern.',
      };
    }
  }

  // Rule 3: Elite Private University
  for (const keyword of ELITE_PRIVATE_KEYWORDS) {
    if (name.includes(keyword)) {
      return {
        category: 'Elite Private University',
        confidence: 0.95,
        rationale: 'Matched elite private institution keyword.',
      };
    }
  }

  // Rule 4: Large Private/Public University
  if (/university\s+of\s+/i.test(name) || /state\s+university/i.test(name)) {
    return {
      category: 'Large Private/Public University',
      confidence: 0.85,
      rationale: 'Matched large university naming pattern (likely flagship).',
    };
  }

  // Rule 5: Mid-Tier State University
  if (/state\s+college|state\s+university|\s+state\s+/i.test(name)) {
    return {
      category: 'Mid-Tier State University',
      confidence: 0.8,
      rationale: 'Matched regional state university naming pattern.',
    };
  }

  // Rule 6: Small Private Non-Profits (default fallback)
  return {
    category: 'Small Private Non-Profits',
    confidence: 0.6,
    rationale: 'Default classification; no specific signals detected.',
  };
}

/**
 * AUTHORIZATION: PUBLIC
 * Deduplicates and merges institution records
 * @param institutions - Array of scraped institutions
 * @returns Deduplicated array
 */
function deduplicateInstitutions(institutions: ScrapedInstitution[]): ScrapedInstitution[] {
  const map = new Map<string, ScrapedInstitution>();

  for (const inst of institutions) {
    const normalizedName = inst.name.toLowerCase().trim();
    const domainKey = inst.website ? new URL(inst.website).hostname : '';
    const key = `${normalizedName}|${domainKey}`;

    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.source_urls = new Set([...existing.source_urls, ...inst.source_urls]);
      if (inst.website && !existing.website) {
        existing.website = inst.website;
      }
      if (inst.city && !existing.city) {
        existing.city = inst.city;
      }
      if (inst.state && !existing.state) {
        existing.state = inst.state;
      }
    } else {
      map.set(key, inst);
    }
  }

  return Array.from(map.values());
}

// ============================================================================
// CONTACT DISCOVERY (STUB)
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Discovers registrar and provost contacts
 * @param institution - Institution to search
 * @returns Contact information
 */
async function discoverContacts(institution: ScrapedInstitution) {
  // NOTE: Full implementation would:
  // 1. Visit institution website
  // 2. Look for staff directory, leadership pages
  // 3. Parse registrar/provost pages
  // 4. Extract emails and phone numbers
  // 5. Cross-check with LinkedIn (public profiles only)

  // For now, return stub to maintain structure
  return {
    registrar_name: null,
    registrar_email: null,
    registrar_contact_form_url: null,
    provost_name: null,
    provost_email: null,
    provost_contact_form_url: null,
    main_office_phone: null,
    main_office_email: null,
  };
}

// ============================================================================
// SCORING & PRIORITIZATION
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Computes Stu ICP/GTM fit score
 * @param institution - Institution to score
 * @returns Fit score (0-100)
 */
function computeFitScore(
  institution: ScrapedInstitution,
  category: InstitutionRow['category']
): { score: number; rationale: string } {
  let score = 0;
  const signals: string[] = [];

  // Base scores by category
  if (category === 'Community College/Junior College') {
    score += 25;
    signals.push('Community college (+25)');
  } else if (category === 'Mid-Tier State University') {
    score += 25;
    signals.push('Mid-tier state university (+25)');
  } else if (category === 'Large Private/Public University') {
    score += 15;
    signals.push('Large university (+15)');
  } else if (category === 'Elite Private University') {
    score += 5;
    signals.push('Elite private (-5 flexibility)');
  } else if (category === 'Small Private Non-Profits') {
    score += 10;
    signals.push('Small private nonprofit (+10)');
  }

  // For-profit penalty
  if (institution.sector === 'For-Profit') {
    score -= 10;
    signals.push('For-profit penalty (-10)');
  }

  // Enrollment signals (placeholder - would require actual data)
  // if (enrollment >= 5000 && enrollment <= 30000) {
  //   score += 10;
  //   signals.push('Enrollment 5k-30k (+10)');
  // }

  // Systems signals (would require visiting site)
  // const siteContent = await fetchUrl(institution.website);
  // for (const sig of SYSTEMS_SIGNALS) {
  //   if (siteContent?.toLowerCase().includes(sig)) {
  //     score += 10;
  //     signals.push(`${sig.toUpperCase()} detected (+10)`);
  //   }
  // }

  score = Math.min(Math.max(score, 0), 100);
  const rationale = signals.join('; ');

  return { score, rationale };
}

// ============================================================================
// MAIN SCRAPER ORCHESTRATOR
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Main scraper function - orchestrates entire workflow
 * @param seedUrls - Array of URLs to scrape
 * @returns Complete scraper result with markdown table, rows, and Excel data
 */
export async function scrapeInstitutions(seedUrls: string[]): Promise<ScraperResult> {
  const startTime = Date.now();
  let scrapeTime = 0;
  let organizeTime = 0;
  let searchTime = 0;
  let contactsTime = 0;

  // ========== STAGE 1: SCRAPE ==========
  const scrapeStart = Date.now();
  const scrapedInstitutions: ScrapedInstitution[] = [];

  for (const url of seedUrls.slice(0, 50)) {
    // Max 50 pages
    const html = await fetchUrl(url);
    if (html) {
      const found = parseInstitutionsFromHtml(html, url);
      scrapedInstitutions.push(...found);
    }
    // Rate limiting: 2-4 req/sec
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 250));
  }

  scrapeTime = Date.now() - scrapeStart;

  // ========== STAGE 2: ORGANIZE ==========
  const organizeStart = Date.now();

  const dedupedInstitutions = deduplicateInstitutions(scrapedInstitutions);

  organizeTime = Date.now() - organizeStart;

  // ========== STAGE 3: CLASSIFY & SEARCH ==========
  const searchStart = Date.now();

  const rows: InstitutionRow[] = dedupedInstitutions.map((inst) => {
    const { category, confidence, rationale } = classifyInstitution(inst);
    const { score, rationale: fitRationale } = computeFitScore(inst, category);

    return {
      name: inst.name,
      aka: inst.aka.size > 0 ? Array.from(inst.aka) : null,
      website: inst.website,
      city: inst.city,
      state: inst.state,
      sector: inst.sector,
      control: inst.sector === 'For-Profit' ? 'For-Profit' : 'Nonprofit',
      category,
      classification_confidence: confidence,
      classification_rationale: rationale,
      enrollment_estimate: null,
      systems_signals: null,
      stu_fit_score: score,
      fit_rationale: fitRationale,
      registrar_name: null,
      registrar_email: null,
      registrar_contact_form_url: null,
      provost_name: null,
      provost_email: null,
      provost_contact_form_url: null,
      main_office_phone: null,
      main_office_email: null,
      source_urls: Array.from(inst.source_urls),
      notes: null,
    };
  });

  searchTime = Date.now() - searchStart;

  // ========== STAGE 4: CONTACT DISCOVERY ==========
  const contactsStart = Date.now();

  // NOTE: Disabled for performance; full implementation would hit each domain
  // for (let i = 0; i < rows.length; i++) {
  //   const contacts = await discoverContacts(rows[i] as any);
  //   Object.assign(rows[i], contacts);
  // }

  contactsTime = Date.now() - contactsStart;

  // ========== GENERATE MARKDOWN TABLE ==========
  const tableMarkdown = generateMarkdownTable(rows);

  // ========== GENERATE SUMMARY ==========
  const summary = `Found and classified ${rows.length} U.S. educational institutions across ${new Set(rows.map((r) => r.category)).size} categories. Data sourced from ${new Set(rows.flatMap((r) => r.source_urls)).size} unique pages. Top fit institutions: ${rows.filter((r) => r.stu_fit_score >= 50).length} institutions score 50+.`;

  const totalTime = Date.now() - startTime;

  return {
    table_markdown: tableMarkdown,
    rows: rows.sort((a, b) => b.stu_fit_score - a.stu_fit_score),
    eta: {
      scrape: Math.ceil(scrapeTime / 1000),
      organize: Math.ceil(organizeTime / 1000),
      search: Math.ceil(searchTime / 1000),
      contacts: Math.ceil(contactsTime / 1000),
      total: Math.ceil(totalTime / 1000),
    },
    xlsx_base64: null, // Will be generated separately
    summary,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Generates a markdown table from institution rows
 * @param rows - Array of institution rows
 * @returns Markdown table string
 */
function generateMarkdownTable(rows: InstitutionRow[]): string {
  if (rows.length === 0) {
    return '| Name | Category | Fit Score | Notes |\n|------|----------|-----------|-------|\n| No institutions found | - | - | - |';
  }

  const headers = [
    '| Name',
    'Category',
    'State',
    'Fit Score',
    'Registrar',
    'Provost',
    'Notes |',
  ];
  const separator =
    '|------|---------------------------|-------|----------|-----------|-----------|---------|';

  const rows_md = rows.slice(0, 50).map((row) => {
    const registrar = row.registrar_email ? `${row.registrar_name}` : 'N/A';
    const provost = row.provost_email ? `${row.provost_name}` : 'N/A';
    const notes = row.notes ? row.notes.substring(0, 20) + '...' : '-';

    return `| ${row.name.substring(0, 30)} | ${row.category} | ${row.state || 'N/A'} | ${row.stu_fit_score} | ${registrar} | ${provost} | ${notes} |`;
  });

  return [headers.join(' '), separator, ...rows_md].join('\n');
}

export async function generateExcelFile(rows: InstitutionRow[]): Promise<string> {
  // This will be called separately from the API
  // Returns base64-encoded Excel file
  // Implementation uses ExcelJS library
  return '';
}
