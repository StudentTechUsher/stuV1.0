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

export interface ContactPerson {
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  department: string;
}

export interface DepartmentContacts {
  department_name: string;
  main_email: string | null;
  main_phone: string | null;
  contacts: ContactPerson[];
}

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
  registrar_department: DepartmentContacts | null;
  provost_department: DepartmentContacts | null;
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
  /colleges?\s+of\s+/i,  // Added: "Colleges of [City]" pattern
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
  // 'chicago',  // REMOVED: Too generic, conflicts with "City Colleges of Chicago"
  'northwestern',
  'rice',
  'vanderbilt',
  'notre dame',
  'johns hopkins',
  'washingon university',
  'carnegie mellon',
  'penn',
];

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
      } as Record<string, unknown>);

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

  // Patterns to exclude from website URLs (athletics, sports, etc.)
  const excludePatterns = [
    /athletics\./i,
    /sports\./i,
    /recreation\./i,
    /intramural\./i,
    /\/athletics\//i,
    /\/sports\//i,
  ];

  /**
   * Sanitize a URL to get the main domain, excluding subdomains like athletics, sports, etc.
   * @param url - The URL to sanitize
   * @returns The main domain URL
   */
  function sanitizeWebsiteUrl(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);

      // Check if subdomain is an excluded type
      const subdomain = parsed.hostname.split('.')[0];
      for (const pattern of excludePatterns) {
        if (pattern.test(subdomain) || pattern.test(url)) {
          // Remove the subdomain and return main domain
          return `https://${parsed.hostname.split('.').slice(-2).join('.')}`;
        }
      }

      return parsed.href;
    } catch {
      return url;
    }
  }

  // Try to find links to .edu domains (common institution URLs)
  $('a[href*=".edu"]').each((_i, elem) => {
    const href = $(elem).attr('href') || '';
    const text = $(elem).text().trim();

    if (text && href.includes('.edu')) {
      // Skip if URL points to excluded subdomains
      let shouldSkip = false;
      for (const pattern of excludePatterns) {
        if (pattern.test(href)) {
          shouldSkip = true;
          break;
        }
      }

      if (!shouldSkip) {
        const { city, state } = extractCityStateFromName(text);
        institutions.push({
          name: text,
          aka: new Set(),
          website: sanitizeWebsiteUrl(href),
          city,
          state,
          sector: null,
          source_urls: new Set([sourceUrl]),
        });
      }
    }
  });

  // Extract table data (common for college lists)
  $('table tbody tr').each((_i, elem) => {
    const cells = $(elem).find('td');
    if (cells.length >= 1) {
      let institutionName = $(cells[0]).text().trim();

      // Skip header rows and extremely short entries
      if (!institutionName || institutionName.length < 3) {
        return;
      }

      // Skip common non-institution table rows (navigation, metadata, etc.)
      if (institutionName.match(/^(edit|view|hide|show|click|download|pdf|cite|ref|note)/i)) {
        return;
      }

      let website = null;
      let city = null;
      let state = null;

      // Try to extract city/state from name first (lower priority)
      const nameLocation = extractCityStateFromName(institutionName);
      city = nameLocation.city;
      state = nameLocation.state;

      // Priority 1: Try to get city/state from dedicated column (typically column 2 or 3)
      for (let i = 1; i < Math.min(cells.length, 4); i++) {
        const cellText = $(cells[i]).text().trim();
        const match = cellText.match(/(.+?),\s*([A-Z]{2})/);
        if (match) {
          city = match[1].trim();
          state = match[2];
          break;
        }
      }

      // Priority 2: Look for website link in next columns (can be .edu or any domain)
      for (let i = 1; i < cells.length; i++) {
        const link = $(cells[i]).find('a');
        if (link.length) {
          const href = link.attr('href') || '';
          // Check if it looks like a URL (starts with http, has domain)
          if (href.startsWith('http') && (href.includes('.edu') || href.match(/\.[a-z]{2,}$/i))) {
            if (!website) {
              website = sanitizeWebsiteUrl(href);
            }
          }
        }
      }

      // NOTE: We don't infer .edu domains anymore since our new AI-driven contact discovery
      // works without websites. Inferring domains was causing issues with malformed URLs.

      // Only add if it looks like a real institution name (has words, not just numbers/symbols)
      if (institutionName.match(/[a-z]/i)) {
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

/**
 * AUTHORIZATION: PUBLIC
 * Extracts city and state from institution name
 * Examples: "City Colleges of Chicago" → {city: "Chicago", state: "IL"}
 *           "Boise State University" → {city: "Boise", state: "ID"}
 * @param name - Institution name
 * @returns {city, state} extracted from name
 */
function extractCityStateFromName(name: string): { city: string | null; state: string | null } {
  const cityStateMap: Record<string, { city: string; state: string }> = {
    // Chicago system
    'chicago': { city: 'Chicago', state: 'IL' },
    'truman': { city: 'Chicago', state: 'IL' },
    'malcolm x': { city: 'Chicago', state: 'IL' },
    'olive-harvey': { city: 'Chicago', state: 'IL' },
    'wright': { city: 'Chicago', state: 'IL' },
    // Common community colleges
    'slcc': { city: 'Salt Lake City', state: 'UT' },
    'salt lake': { city: 'Salt Lake City', state: 'UT' },
    'snow': { city: 'Ephraim', state: 'UT' },
    'boise state': { city: 'Boise', state: 'ID' },
    'northern arizona': { city: 'Flagstaff', state: 'AZ' },
    'uvu': { city: 'Orem', state: 'UT' },
    'asu': { city: 'Tempe', state: 'AZ' },
    'ucla': { city: 'Los Angeles', state: 'CA' },
    'stanford': { city: 'Stanford', state: 'CA' },
    'harvard': { city: 'Cambridge', state: 'MA' },
    'yale': { city: 'New Haven', state: 'CT' },
    'berkeley': { city: 'Berkeley', state: 'CA' },
    'michigan': { city: 'Ann Arbor', state: 'MI' },
    'penn': { city: 'Philadelphia', state: 'PA' },
    'columbia': { city: 'New York', state: 'NY' },
  };

  const nameLower = name.toLowerCase();

  // Check for known city/state combinations
  for (const [key, location] of Object.entries(cityStateMap)) {
    if (nameLower.includes(key)) {
      return location;
    }
  }

  // Try to extract "City, State" pattern
  const match = name.match(/(.+?),\s*([A-Z]{2})/);
  if (match) {
    return {
      city: match[1].trim(),
      state: match[2],
    };
  }

  // Try to extract just city name before college/university keywords
  const cityMatch = name.match(/^([A-Za-z\s]+?)\s+(City\s+)?Colleges?/i);
  if (cityMatch) {
    const city = cityMatch[1].trim();
    // Try to infer state from city name (would need a larger database)
    return { city, state: null };
  }

  return { city: null, state: null };
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
// CONTACT DISCOVERY (AI-DRIVEN WEB SEARCH)
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Uses Google Gemini AI with web search to find registrar/provost contact information
 * This method works for all institutions regardless of website availability
 * @param institutionName - Name of the institution
 * @param department - 'Registrar' or 'Provost'
 * @returns Contact information discovered via AI search
 */
export async function searchForContactsWithAI(
  institutionName: string,
  department: 'Registrar' | 'Provost'
): Promise<DepartmentContacts> {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GOOGLE_GEMINI_API_KEY not configured, skipping AI contact search');
      return {
        department_name: department,
        main_email: null,
        main_phone: null,
        contacts: [],
      };
    }

    const prompt = `You are an expert research assistant finding contact information for university staff.

TASK: Find the ${department} contact information for ${institutionName}.

Search for and extract:
1. The official ${department} email address
2. Main phone number for the ${department} office
3. The ${department}'s name and title (e.g., "Dr. Jane Smith, Registrar")
4. Any other ${department} staff members' contact info if available

Use web search to find current, verified information from official university sources.

Return ONLY valid JSON in this exact format with no markdown or extra text:
{
  "main_email": "registrar@university.edu or null",
  "main_phone": "+1-555-123-4567 or null",
  "contacts": [
    {
      "name": "Full Name",
      "title": "${department}",
      "email": "email@university.edu or null",
      "phone": "+1-555-123-4567 or null"
    }
  ]
}

CRITICAL:
- Do NOT invent or guess information
- Only extract ACTUAL verified contact information found through search
- If you cannot find something, use null (not empty string)
- Institutional emails must be .edu domains
- Phone numbers should be formatted as +1-XXX-XXX-XXXX
- Return contacts array with at least the ${department} if found`;

    // Call Google Gemini API with web search
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.2, // Low temp for factual accuracy
        },
        tools: [
          {
            googleSearch: {},
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const candidates = data.candidates as Array<{content?: {parts?: Array<{text?: string}>}}> | undefined;

    if (!candidates || candidates.length === 0) {
      console.log(`No results found for ${institutionName} ${department}`);
      return {
        department_name: department,
        main_email: null,
        main_phone: null,
        contacts: [],
      };
    }

    const responseText = candidates[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`Could not parse JSON for ${institutionName} ${department}`);
      return {
        department_name: department,
        main_email: null,
        main_phone: null,
        contacts: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      department_name: department,
      main_email: (parsed.main_email as string | null) || null,
      main_phone: (parsed.main_phone as string | null) || null,
      contacts: ((parsed.contacts as Array<Record<string, unknown>>) || []).map(
        (c) =>
          ({
            name: (c.name as string) || '',
            title: (c.title as string) || department,
            email: (c.email as string | null) || null,
            phone: (c.phone as string | null) || null,
            department,
          } as ContactPerson)
      ),
    };
  } catch (error) {
    console.error(`AI contact search failed for ${institutionName} ${department}:`, error);
    return {
      department_name: department,
      main_email: null,
      main_phone: null,
      contacts: [],
    };
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Discovers registrar and provost contacts using AI-driven web search
 * Works for ALL institutions regardless of website availability
 * @param institution - Institution to search for
 * @returns Contact information
 */
async function discoverContacts(institution: ScrapedInstitution) {
  const results = {
    registrar_name: null as string | null,
    registrar_email: null as string | null,
    registrar_contact_form_url: null as string | null,
    provost_name: null as string | null,
    provost_email: null as string | null,
    provost_contact_form_url: null as string | null,
    main_office_phone: null as string | null,
    main_office_email: null as string | null,
    registrar_department: null as DepartmentContacts | null,
    provost_department: null as DepartmentContacts | null,
  };

  try {
    // Use AI to search for registrar contacts
    const registrarDept = await searchForContactsWithAI(institution.name, 'Registrar');

    if (registrarDept.contacts.length > 0 || registrarDept.main_email || registrarDept.main_phone) {
      results.registrar_department = registrarDept;

      // Get primary contact info
      if (registrarDept.contacts.length > 0) {
        const primary = registrarDept.contacts[0];
        results.registrar_name = primary.name;
        results.registrar_email = primary.email;
      }
      if (registrarDept.main_email) {
        results.main_office_email = registrarDept.main_email;
      }
      if (registrarDept.main_phone) {
        results.main_office_phone = registrarDept.main_phone;
      }
    }

    // Use AI to search for provost contacts
    const provostDept = await searchForContactsWithAI(institution.name, 'Provost');

    if (provostDept.contacts.length > 0 || provostDept.main_email || provostDept.main_phone) {
      results.provost_department = provostDept;

      // Get primary contact info
      if (provostDept.contacts.length > 0) {
        const primary = provostDept.contacts[0];
        results.provost_name = primary.name;
        results.provost_email = primary.email;
      }
    }

    return results;
  } catch (error) {
    console.error(`Contact discovery failed for ${institution.name}:`, error);
    return results;
  }
}

// ============================================================================
// SCORING & PRIORITIZATION
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Computes Stu ICP/GTM fit score based on Stu's actual ICP
 *
 * Stu ICP (Ideal Customer Profile):
 * - Type: Mid-sized public universities and community colleges
 * - Size: 5,000–25,000 enrolled students
 * - Pain Points: Advisor overload, poor graduation visibility, retention pressure
 * - Systems: Ellucian Banner, DegreeWorks, CourseLeaf (frustrated, want replacement)
 * - Buying Team: Registrar, Provost, Director of Student Success
 * - Priority: Retention, efficiency, student satisfaction
 *
 * @param institution - Institution to score
 * @returns Fit score (0-100)
 */
function computeFitScore(
  _institution: ScrapedInstitution,
  category: InstitutionRow['category']
): { score: number; rationale: string } {
  let score = 0;
  const signals: string[] = [];

  // Base scores aligned with Stu ICP
  if (category === 'Community College/Junior College') {
    score += 90;
    signals.push('ICP Match: Community college (5k-25k enrollment, advisor overload, retention focus)');
  } else if (category === 'Mid-Tier State University') {
    score += 85;
    signals.push('ICP Match: Mid-tier state university (ideal size & pain points)');
  } else if (category === 'Large Private/Public University') {
    score += 50;
    signals.push('Partial match: May be too large or have custom systems');
  } else if (category === 'Small Private Non-Profits') {
    score += 40;
    signals.push('Lower priority: Smaller budgets, less advisor overload');
  } else if (category === 'For-Profit/Technical College') {
    score += 35;
    signals.push('Not ideal: Different buying team, ROI vs. student success focus');
  } else if (category === 'Elite Private University') {
    score += 15;
    signals.push('Poor fit: Custom systems, slow cycles, low retention pain');
  }

  // Enrollment size bonus (ICP: 5k-25k)
  // Note: Would require actual enrollment data from institution website
  // if (enrollment >= 5000 && enrollment <= 25000) {
  //   score += 10;
  //   signals.push('Enrollment 5k-25k: ICP sweet spot');
  // }

  // Systems signals (would require site parsing)
  // const siteContent = await fetchUrl(institution.website);
  // if (siteContent?.toLowerCase().includes('banner')) {
  //   score += 15;
  //   signals.push('Uses Banner: Known frustration point, prime for replacement');
  // }
  // if (siteContent?.toLowerCase().includes('degreeworks')) {
  //   score += 10;
  //   signals.push('Uses DegreeWorks: Known pain point');
  // }

  score = Math.min(Math.max(score, 0), 100);
  const rationale = signals.join(' | ');

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
      registrar_department: null,
      provost_department: null,
      source_urls: Array.from(inst.source_urls),
      notes: null,
    };
  });

  searchTime = Date.now() - searchStart;

  // ========== STAGE 4: CONTACT DISCOVERY (AI-DRIVEN - SKIPPED FOR NOW) ==========
  // NOTE: Contact discovery is now done AFTER returning results to the client
  // This allows the user to see the list immediately while contact info is gathered in background
  const contactsStart = Date.now();
  contactsTime = 0; // Will be calculated during background discovery

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

export async function generateExcelFile(_rows: InstitutionRow[]): Promise<string> {
  // This will be called separately from the API
  // Returns base64-encoded Excel file
  // Implementation uses ExcelJS library
  return '';
}
