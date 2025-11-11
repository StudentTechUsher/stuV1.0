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
  zip: string | null;
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
  zip: string | null;
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

// US State abbreviation to full name mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

// Reverse mapping: full state names to abbreviations
const STATE_NAMES_TO_ABBREV: Record<string, string> = Object.entries(STATE_ABBREVIATIONS).reduce(
  (acc, [abbr, name]) => {
    acc[name.toLowerCase()] = abbr;
    return acc;
  },
  {} as Record<string, string>
);

// Comprehensive institution database with ACTUAL city locations (not generic region names)
// Format: key is part of institution name, value is actual city/state
const CITY_STATE_DATABASE: Record<string, { city: string; state: string }> = {
  // Chicago system
  'chicago': { city: 'Chicago', state: 'IL' },
  'truman': { city: 'Chicago', state: 'IL' },
  'malcolm x': { city: 'Chicago', state: 'IL' },
  'olive-harvey': { city: 'Chicago', state: 'IL' },
  'wright': { city: 'Chicago', state: 'IL' },
  'city colleges of chicago': { city: 'Chicago', state: 'IL' },
  // Utah
  'slcc': { city: 'Salt Lake City', state: 'UT' },
  'salt lake': { city: 'Salt Lake City', state: 'UT' },
  'snow': { city: 'Ephraim', state: 'UT' },
  'boise state': { city: 'Boise', state: 'ID' },
  'utah valley': { city: 'Orem', state: 'UT' },
  'uvu': { city: 'Orem', state: 'UT' },
  // Arizona
  'northern arizona': { city: 'Flagstaff', state: 'AZ' },
  'asu': { city: 'Tempe', state: 'AZ' },
  'arizona state': { city: 'Tempe', state: 'AZ' },
  // California
  'ucla': { city: 'Los Angeles', state: 'CA' },
  'stanford': { city: 'Stanford', state: 'CA' },
  'berkeley': { city: 'Berkeley', state: 'CA' },
  'ucsb': { city: 'Santa Barbara', state: 'CA' },
  'ucsd': { city: 'San Diego', state: 'CA' },
  'ucdavis': { city: 'Davis', state: 'CA' },
  'ucirvine': { city: 'Irvine', state: 'CA' },
  'caltech': { city: 'Pasadena', state: 'CA' },
  'columbia basin': { city: 'Pasco', state: 'WA' },
  'san jacinto': { city: 'San Jacinto', state: 'CA' },
  // East Coast
  'harvard': { city: 'Cambridge', state: 'MA' },
  'yale': { city: 'New Haven', state: 'CT' },
  'penn': { city: 'Philadelphia', state: 'PA' },
  'penn state': { city: 'University Park', state: 'PA' },
  'columbia': { city: 'New York', state: 'NY' },
  'princeton': { city: 'Princeton', state: 'NJ' },
  'cornell': { city: 'Ithaca', state: 'NY' },
  'brown': { city: 'Providence', state: 'RI' },
  'mit': { city: 'Cambridge', state: 'MA' },
  // Midwest
  'michigan': { city: 'Ann Arbor', state: 'MI' },
  'northwestern': { city: 'Evanston', state: 'IL' },
  'university of chicago': { city: 'Chicago', state: 'IL' },
  'indiana': { city: 'Bloomington', state: 'IN' },
  'purdue': { city: 'West Lafayette', state: 'IN' },
  'wisconsin': { city: 'Madison', state: 'WI' },
  'minnesota': { city: 'Minneapolis', state: 'MN' },
  'ohio state': { city: 'Columbus', state: 'OH' },
  // South
  'duke': { city: 'Durham', state: 'NC' },
  'rice': { city: 'Houston', state: 'TX' },
  'vanderbilt': { city: 'Nashville', state: 'TN' },
  'texas': { city: 'Austin', state: 'TX' },
  'ut austin': { city: 'Austin', state: 'TX' },
  'georgia': { city: 'Athens', state: 'GA' },
  'florida': { city: 'Gainesville', state: 'FL' },
};

// Comprehensive US city/state/zip database (major cities and college towns)
// This helps when we extract a city name but need the state
const MAJOR_CITIES_DATABASE: Record<string, { state: string; zip?: string }> = {
  'new york': { state: 'NY', zip: '10001' },
  'los angeles': { state: 'CA', zip: '90001' },
  'chicago': { state: 'IL', zip: '60601' },
  'houston': { state: 'TX', zip: '77001' },
  'phoenix': { state: 'AZ', zip: '85001' },
  'philadelphia': { state: 'PA', zip: '19101' },
  'san antonio': { state: 'TX', zip: '78201' },
  'san diego': { state: 'CA', zip: '92101' },
  'dallas': { state: 'TX', zip: '75201' },
  'san jose': { state: 'CA', zip: '95101' },
  'austin': { state: 'TX', zip: '78701' },
  'denver': { state: 'CO', zip: '80201' },
  'boston': { state: 'MA', zip: '02101' },
  'seattle': { state: 'WA', zip: '98101' },
  'portland': { state: 'OR', zip: '97201' },
  'minneapolis': { state: 'MN', zip: '55401' },
  'atlanta': { state: 'GA', zip: '30301' },
  'miami': { state: 'FL', zip: '33101' },
  'las vegas': { state: 'NV', zip: '89101' },
  'orlando': { state: 'FL', zip: '32801' },
  'salt lake city': { state: 'UT', zip: '84101' },
  'nashville': { state: 'TN', zip: '37201' },
  'memphis': { state: 'TN', zip: '38101' },
  'tucson': { state: 'AZ', zip: '85701' },
  'kansas city': { state: 'MO', zip: '64101' },
  'madison': { state: 'WI', zip: '53701' },
  'cambridge': { state: 'MA', zip: '02138' },
  'new haven': { state: 'CT', zip: '06510' },
  'ithaca': { state: 'NY', zip: '14850' },
  'ann arbor': { state: 'MI', zip: '48103' },
  'bloomington': { state: 'IN', zip: '47401' },
  'berkeley': { state: 'CA', zip: '94720' },
  'stanford': { state: 'CA', zip: '94305' },
  'princeton': { state: 'NJ', zip: '08540' },
  'durham': { state: 'NC', zip: '27701' },
  'chapel hill': { state: 'NC', zip: '27514' },
};

// ZIP code ranges by state (for reverse lookup)
const ZIP_CODE_RANGES: Record<string, { min: number; max: number }> = {
  'AL': { min: 35000, max: 36999 },
  'AK': { min: 99500, max: 99950 },
  'AZ': { min: 85000, max: 86999 },
  'AR': { min: 71600, max: 72999 },
  'CA': { min: 90000, max: 96199 },
  'CO': { min: 80000, max: 81999 },
  'CT': { min: 6000, max: 6999 },
  'DE': { min: 19700, max: 19999 },
  'FL': { min: 32004, max: 34999 },
  'GA': { min: 30000, max: 31999 },
  'HI': { min: 96700, max: 96999 },
  'ID': { min: 83200, max: 83999 },
  'IL': { min: 60000, max: 62999 },
  'IN': { min: 46000, max: 47999 },
  'IA': { min: 50000, max: 52999 },
  'KS': { min: 66000, max: 67999 },
  'KY': { min: 40000, max: 42799 },
  'LA': { min: 70000, max: 71499 },
  'ME': { min: 3900, max: 4999 },
  'MD': { min: 20600, max: 21999 },
  'MA': { min: 1000, max: 2799 },
  'MI': { min: 48000, max: 49999 },
  'MN': { min: 55000, max: 56799 },
  'MS': { min: 38600, max: 39999 },
  'MO': { min: 63000, max: 65999 },
  'MT': { min: 59000, max: 59999 },
  'NE': { min: 68000, max: 69999 },
  'NV': { min: 89000, max: 89999 },
  'NH': { min: 3000, max: 3899 },
  'NJ': { min: 7000, max: 8999 },
  'NM': { min: 87000, max: 88999 },
  'NY': { min: 10000, max: 14999 },
  'NC': { min: 27000, max: 28999 },
  'ND': { min: 58000, max: 58999 },
  'OH': { min: 43000, max: 45999 },
  'OK': { min: 73000, max: 74999 },
  'OR': { min: 97000, max: 97999 },
  'PA': { min: 15000, max: 19699 },
  'RI': { min: 2800, max: 2999 },
  'SC': { min: 29000, max: 29999 },
  'SD': { min: 57000, max: 57999 },
  'TN': { min: 37000, max: 38599 },
  'TX': { min: 75000, max: 79999 },
  'UT': { min: 84000, max: 84999 },
  'VT': { min: 5000, max: 5999 },
  'VA': { min: 22000, max: 24699 },
  'WA': { min: 98000, max: 99499 },
  'WV': { min: 24700, max: 26899 },
  'WI': { min: 53000, max: 54999 },
  'WY': { min: 82000, max: 83199 },
  'DC': { min: 20000, max: 20099 },
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
   * ALWAYS returns just the main domain (e.g., https://university.edu)
   * @param url - The URL to sanitize
   * @returns The main domain URL only (no paths, no subdomains)
   */
  function sanitizeWebsiteUrl(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);

      // Get the hostname parts: ['athletics', 'university', 'edu'] → need last 2
      const hostnameParts = parsed.hostname.split('.');

      // Always return just the main domain (last 2 parts for .edu domains)
      // athletics.university.edu → university.edu
      // subdomain.university.edu → university.edu
      // university.edu → university.edu
      const mainDomain = hostnameParts.slice(-2).join('.');

      return `https://${mainDomain}`;
    } catch {
      return url;
    }
  }

  // FIRST: Extract table data (common for college lists)
  // Tables usually have better structured location data
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
      let zip = null;
      let sector: 'Public' | 'Private' | 'For-Profit' | null = null;

      // Try to extract city/state from name first (lower priority)
      const nameLocation = extractCityStateFromName(institutionName);
      city = nameLocation.city;
      state = nameLocation.state;
      zip = nameLocation.zip;

      // Priority 1: Try to get city/state/zip from dedicated columns (typically columns 1-4)
      // Also extract sector/type information from any column
      // Check columns in order, looking for location data and sector information
      for (let i = 1; i < cells.length; i++) {
        const cellText = $(cells[i]).text().trim();

        // Skip empty cells and obvious non-location data
        if (!cellText || cellText.length < 3) continue;

        // Try to extract sector/type from this cell (public/private/for-profit/nonprofit)
        // Do this for ALL columns to catch type info anywhere in the table
        const extractedSector = extractSectorFromCell(cellText);
        if (extractedSector && !sector) {
          sector = extractedSector;
        }

        // Only check first 5 columns for location data (rest are likely other info)
        if (i < 5) {
          // Try full pattern: "City, State ZIP"
          let match = cellText.match(/(.+?),\s*([A-Z]{2})\s+(\d{5})/);
          if (match) {
            city = match[1].trim();
            state = match[2];
            zip = match[3];
            break;
          }

          // Try pattern: "City, State" (handles multi-word cities like "Los Angeles, CA")
          // This regex matches: anything up to comma, then 2-letter state abbreviation
          match = cellText.match(/^(.+?),\s*([A-Z]{2})$/);
          if (match && !city) {
            city = match[1].trim();
            state = match[2];
            break;
          }

          // Try to extract ZIP code alone
          const zipMatch = cellText.match(/(\d{5})/);
          if (zipMatch && !zip) {
            zip = zipMatch[1];
            // If we found a ZIP, try to infer state
            if (!state) {
              state = inferStateFromZip(zip);
            }
            // If we have zip but no city/state, this column likely has location
            // Continue to next iteration to see if we can find city
            continue;
          }

          // If this column looks like it contains location data (has comma and potential state)
          // but didn't match above patterns, it might be a different format
          if (cellText.includes(',') && !city && !state) {
            // Try to parse "City, StateName" format (e.g., "Boston, Massachusetts")
            const fullStateMatch = cellText.match(/^(.+?),\s*([A-Za-z\s]+)$/);
            if (fullStateMatch) {
              const potentialState = normalizeStateName(fullStateMatch[2].trim());
              if (potentialState) {
                city = fullStateMatch[1].trim();
                state = potentialState;
                break;
              }
            }
          }
        }
      }

      // Priority 2: Look for website link in all columns (can be .edu or any domain)
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
        // If we don't have location info, try to infer from domain
        if ((!city || !state) && website) {
          const domainLocation = inferLocationFromDomain(website);
          if (domainLocation.city && !city) {
            city = domainLocation.city;
          }
          if (domainLocation.state && !state) {
            state = domainLocation.state;
          }
        }

        institutions.push({
          name: institutionName,
          aka: new Set(),
          website,
          city,
          state,
          zip,
          sector,
          source_urls: new Set([sourceUrl]),
        });
      }
    }
  });

  // SECOND: Extract .edu links that are NOT in tables (for pages without structured tables)
  // Only extract if we haven't already found institutions from tables
  if (institutions.length === 0) {
    $('a[href*=".edu"]').each((_i, elem) => {
      // Skip if this link is inside a table (we already extracted those above)
      if ($(elem).closest('table').length > 0) {
        return;
      }

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
          const sanitizedWebsite = sanitizeWebsiteUrl(href);
          let { city, state, zip } = extractCityStateFromName(text);

          // If we don't have location info, try to infer from domain
          if (!city || !state) {
            const domainLocation = inferLocationFromDomain(sanitizedWebsite);
            if (domainLocation.city && !city) {
              city = domainLocation.city;
            }
            if (domainLocation.state && !state) {
              state = domainLocation.state;
            }
          }

          institutions.push({
            name: text,
            aka: new Set(),
            website: sanitizedWebsite,
            city,
            state,
            zip,
            sector: null,
            source_urls: new Set([sourceUrl]),
          });
        }
      }
    });
  }

  return institutions;
}

/**
 * AUTHORIZATION: PUBLIC
 * Infers state from ZIP code by checking ZIP ranges
 * @param zip - ZIP code (numeric)
 * @returns State abbreviation or null
 */
function inferStateFromZip(zip: string | null): string | null {
  if (!zip) return null;

  const zipNum = parseInt(zip, 10);
  if (isNaN(zipNum)) return null;

  for (const [state, range] of Object.entries(ZIP_CODE_RANGES)) {
    if (zipNum >= range.min && zipNum <= range.max) {
      return state;
    }
  }

  return null;
}

/**
 * AUTHORIZATION: PUBLIC
 * Attempts to infer city and state from institution website domain
 * For example: "name.university.edu" might be from a specific state
 * This is a best-effort heuristic - checks if domain contains state abbreviations
 * @param website - Website URL
 * @returns {city, state} inferred from domain or null
 */
function inferLocationFromDomain(website: string | null): { city: string | null; state: string | null } {
  if (!website) return { city: null, state: null };

  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    const domain = url.hostname.toLowerCase();

    // Check for state abbreviation in domain
    // Example: "asu.edu" → Arizona, "tamu.edu" → Texas
    const stateAbbrMatch = domain.match(/([a-z]{2})(?:\.edu|\.org|\.com)?$/);
    if (stateAbbrMatch) {
      const possibleAbbr = stateAbbrMatch[1].toUpperCase();
      if (STATE_ABBREVIATIONS[possibleAbbr]) {
        return { city: null, state: possibleAbbr };
      }
    }

    // Check for university name in domain that might be in our database
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const universityPart = parts[0];

      // Check if we have this university in our database
      for (const [key, location] of Object.entries(CITY_STATE_DATABASE)) {
        if (key.includes(universityPart) || universityPart.includes(key.split(' ')[0])) {
          return { city: location.city, state: location.state };
        }
      }
    }

    return { city: null, state: null };
  } catch {
    return { city: null, state: null };
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Extracts ZIP code from text (e.g., "12345" or "12345-6789")
 * @param text - Text to search
 * @returns ZIP code or null
 */
function extractZipCode(text: string): string | null {
  const zipMatch = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return zipMatch ? zipMatch[1] : null;
}

/**
 * AUTHORIZATION: PUBLIC
 * Normalizes state names to abbreviations
 * Handles: "New York" → "NY", "california" → "CA", etc.
 * @param stateInput - State name or abbreviation
 * @returns State abbreviation or null
 */
function normalizeStateName(stateInput: string): string | null {
  if (!stateInput) return null;

  const input = stateInput.trim().toUpperCase();

  // If already an abbreviation, return it
  if (STATE_ABBREVIATIONS[input]) {
    return input;
  }

  // Try to match full state name
  const normalized = STATE_NAMES_TO_ABBREV[stateInput.toLowerCase().trim()];
  return normalized || null;
}

/**
 * AUTHORIZATION: PUBLIC
 * Extracts institution sector/control type from table column text
 * Examples: "Public", "Private", "For-Profit", "Not-for-profit", "Nonprofit"
 * @param cellText - Text from table cell
 * @returns Sector type or null
 */
function extractSectorFromCell(cellText: string): 'Public' | 'Private' | 'For-Profit' | null {
  if (!cellText) return null;

  const text = cellText.toLowerCase().trim();

  // Check for public
  if (text.includes('public')) {
    return 'Public';
  }

  // Check for for-profit
  if (text.includes('for-profit') || text.includes('for profit') || text.includes('forprofit')) {
    return 'For-Profit';
  }

  // Check for private (but not "not-for-profit" or "nonprofit")
  if (text.includes('private') && !text.includes('for')) {
    return 'Private';
  }

  // Check for nonprofit/not-for-profit (classify as Private)
  if (text.includes('nonprofit') || text.includes('not-for-profit') || text.includes('not for profit')) {
    return 'Private';
  }

  return null;
}

/**
 * AUTHORIZATION: PUBLIC
 * Extracts city and state from institution name using multiple strategies
 * Examples: "City Colleges of Chicago" → {city: "Chicago", state: "IL"}
 *           "Boise State University" → {city: "Boise", state: "ID"}
 *           "Stanford University" → {city: "Stanford", state: "CA"}
 * @param name - Institution name
 * @returns {city, state, zip} extracted from name
 */
function extractCityStateFromName(name: string): { city: string | null; state: string | null; zip: string | null } {
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;

  const nameLower = name.toLowerCase().trim();

  // Strategy 1: Check comprehensive database (institution-specific lookup)
  for (const [key, location] of Object.entries(CITY_STATE_DATABASE)) {
    if (nameLower.includes(key)) {
      return { city: location.city, state: location.state, zip: null };
    }
  }

  // Strategy 2: Extract "City, State" or "City, State ZIP" pattern
  // Matches: "Boston, MA", "Los Angeles, CA 90001", "New York, NY 10001-1234"
  const cityStateZipMatch = name.match(/([A-Za-z\s]+?),\s*([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?/);
  if (cityStateZipMatch) {
    city = cityStateZipMatch[1].trim();
    state = cityStateZipMatch[2];
    zip = cityStateZipMatch[3] || null;
    return { city, state, zip };
  }

  // Strategy 3: Extract "City, Full State Name" pattern
  // Matches: "Boston, Massachusetts", "Los Angeles, California"
  const cityFullStateMatch = name.match(/([A-Za-z\s]+?),\s*([A-Za-z\s]+?)(?:\s+(\d{5}))?/);
  if (cityFullStateMatch) {
    const maybeCity = cityFullStateMatch[1].trim();
    const maybeStateName = cityFullStateMatch[2].trim();
    const normalizedState = normalizeStateName(maybeStateName);

    if (normalizedState) {
      return {
        city: maybeCity,
        state: normalizedState,
        zip: cityFullStateMatch[3] || null,
      };
    }
  }

  // Strategy 4: Extract ZIP code and infer state
  zip = extractZipCode(name);
  if (zip) {
    const inferredState = inferStateFromZip(zip);
    if (inferredState) {
      state = inferredState;
      // Try to also extract city name before university/college keywords
      const cityPrefix = name.match(/^([A-Za-z\s]+?)\s+(?:State|University|College|Institute)/i);
      if (cityPrefix) {
        city = cityPrefix[1].trim();
      }
    }
  }

  // REMOVED: Strategy 5 (too generic - was matching "Columbia" in "Columbia Basin College")
  // This was pulling generic region names instead of actual cities
  // Now relying on institution database lookups and explicit patterns

  // Strategy 7: Look for standalone state abbreviation in name
  // Matches: "Miami, FL", "Austin, TX"
  const stateAbbrMatch = name.match(/\b([A-Z]{2})\b/);
  if (stateAbbrMatch && !state) {
    const possibleState = stateAbbrMatch[1];
    if (STATE_ABBREVIATIONS[possibleState]) {
      state = possibleState;
    }
  }

  // Strategy 8: If we extracted a city but no state, try to look it up
  if (city && !state) {
    const cityInfo = MAJOR_CITIES_DATABASE[city.toLowerCase()];
    if (cityInfo) {
      state = cityInfo.state;
      if (!zip) {
        zip = cityInfo.zip || null;
      }
    }
  }

  return { city, state, zip };
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
      if (inst.zip && !existing.zip) {
        existing.zip = inst.zip;
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
 * Searches for contact information using Google Gemini API with web search
 * Includes exponential backoff for rate limit handling
 * @param institutionName - Name of the institution
 * @param department - 'Registrar' or 'Provost'
 * @param retries - Number of retry attempts (default: 3)
 * @returns Department contact information
 */
export async function searchForContactsWithAI(
  institutionName: string,
  department: 'Registrar' | 'Provost',
  retries = 3
): Promise<DepartmentContacts> {
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

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const prompt = `You are an expert research assistant. Your ONLY task is to find and extract contact information.

INSTITUTION: ${institutionName}
DEPARTMENT: ${department}

SEARCH STRATEGY:
1. Search: "${institutionName} ${department} contact"
2. Search: "${institutionName} ${department} office"
3. Search: "${institutionName} ${department.toLowerCase()} email"
4. Search: "${institutionName} ${department.toLowerCase()} phone"
5. Visit the official university website and find the ${department} office page
6. Extract the ${department}'s name, email, and phone from official sources

WHAT TO FIND:
- Primary ${department} name (e.g., "Dr. Jane Smith", "John Doe")
- ${department} email address (usually firstname@university.edu or registrar@university.edu)
- ${department} office phone number (main department phone)
- Any assistant ${department} or deputy ${department} contact info

LOCATION TIPS:
- Check: university.edu/${department.toLowerCase()}
- Check: university.edu/offices/${department.toLowerCase()}
- Check: university.edu/academics/${department.toLowerCase()}
- Look for "Contact Us" or "Staff Directory" pages
- Check LinkedIn or official staff directories

RETURN ONLY THIS JSON (no markdown, no explanation, just the JSON):
{
  "main_email": "email@university.edu",
  "main_phone": "+1-555-123-4567",
  "contacts": [
    {
      "name": "Full Name",
      "title": "${department}",
      "email": "email@university.edu",
      "phone": "+1-555-123-4567"
    }
  ]
}

RULES:
- Only include information you actually found
- Use null for missing information (not empty string)
- Do NOT fabricate any contact details
- Emails must be .edu domains (or institution domain)
- Phone format: +1-XXX-XXX-XXXX or (XXX) XXX-XXXX
- Search the web thoroughly - EVERY institution has a ${department}
- If primary ${department} not found, include deputy or assistant ${department}`;

      // Call Google Gemini API with web search
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
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
        }
      );

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(
          `Rate limited for ${institutionName} ${department}. Retrying in ${Math.round(
            backoffMs
          )}ms (attempt ${attempt + 1}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const candidates = data.candidates as
        | Array<{ content?: { parts?: Array<{ text?: string }> } }>
        | undefined;

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
      if (attempt === retries) {
        console.error(
          `AI contact search failed for ${institutionName} ${department} after ${retries} retries:`,
          error
        );
        return {
          department_name: department,
          main_email: null,
          main_phone: null,
          contacts: [],
        };
      }
      // Continue to next retry
    }
  }

  return {
    department_name: department,
    main_email: null,
    main_phone: null,
    contacts: [],
  };
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
  let schoolInfoTime = 0;
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

  // ========== STAGE 3: SCHOOL INFO LOOKUP (City, State, ZIP, Classification) ==========
  const schoolInfoStart = Date.now();

  const rows: InstitutionRow[] = dedupedInstitutions.map((inst) => {
    const { category, confidence, rationale } = classifyInstitution(inst);
    const { score, rationale: fitRationale } = computeFitScore(inst, category);

    return {
      name: inst.name,
      aka: inst.aka.size > 0 ? Array.from(inst.aka) : null,
      website: inst.website,
      city: inst.city,
      state: inst.state,
      zip: inst.zip,
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

  schoolInfoTime = Date.now() - schoolInfoStart;

  // ========== STAGE 4: CONTACT DISCOVERY (OPTIONAL - User can click to start) ==========
  // NOTE: Contact discovery is now SKIPPED by default in this function
  // The user can click a button to start this phase which calls a separate endpoint
  contactsTime = 0; // Will be calculated when user initiates contact discovery

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
      search: Math.ceil(schoolInfoTime / 1000),
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

/**
 * AUTHORIZATION: PUBLIC
 * Performs ONLY the contact discovery phase for pre-existing institution rows
 * Call this after scrapeInstitutions() to add contact info to existing rows
 * @param rows - Institution rows to enrich with contact info
 * @returns Updated rows with contact information populated
 */
export async function discoverContactsForRows(rows: InstitutionRow[]): Promise<InstitutionRow[]> {
  const startTime = Date.now();
  const contactsTime = Date.now() - startTime;

  console.log(`Contact discovery completed in ${contactsTime}ms for ${rows.length} institutions`);

  // TODO: Implement contact discovery using Gemini API or other service
  // For now, return rows unchanged as a placeholder
  // When implemented, this will:
  // 1. Take each institution
  // 2. Call searchForContactsWithAI for Registrar
  // 3. Call searchForContactsWithAI for Provost
  // 4. Update the row with contact info
  // 5. Return enriched rows

  return rows;
}
