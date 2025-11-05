import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SchoolRow {
  name: string;
  website: string | null;
  city: string | null;
  state: string | null;
  registrar_name: string | null;
  registrar_email: string | null;
  registrar_phone: string | null;
  registrar_page_url: string | null;
  provost_name: string | null;
  provost_email: string | null;
  provost_phone: string | null;
  provost_page_url: string | null;
  dept_email: string | null;
  dept_phone: string | null;
  main_office_email: string | null;
  main_office_phone: string | null;
  state_confidence: number;
  contact_confidence: number;
  source_urls: string[];
  notes: string | null;
}

interface ExtractionInput {
  name: string;
  website: string | null;
  blobs: Array<{ url: string; text: string }>;
  seedCity?: string | null;
  seedState?: string | null;
}

let client: GoogleGenerativeAI | null = null;
let lastQuotaError: { time: number; retryAfter: number } | null = null;

function initializeClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

function checkQuotaStatus(): boolean {
  if (!lastQuotaError) return true;
  const now = Date.now();
  const timeSinceError = (now - lastQuotaError.time) / 1000;
  return timeSinceError >= lastQuotaError.retryAfter;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /[\d\s\-\+\(\)]{10,}/;
  return phoneRegex.test(phone);
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function extractWithGemini(
  input: ExtractionInput
): Promise<SchoolRow> {
  const apiClient = initializeClient();
  const model = apiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const blobTexts = input.blobs.map((b) => `URL: ${b.url}\nContent:\n${b.text}`).join('\n\n---\n\n');

  const seedInfo = input.seedCity || input.seedState ? `\nSeed Info: City=${input.seedCity || 'unknown'}, State=${input.seedState || 'unknown'}` : '';

  const prompt = `You are a contact extraction expert. Extract ONLY verifiable facts from the provided text blobs.

School: ${input.name}
Website: ${input.website || 'unknown'}${seedInfo}

TEXT BLOBS:
${blobTexts}

EXTRACTION TASK:
1. Find and extract Registrar contact (name, email, phone, page URL where found).
2. Find and extract Provost contact (name, email, phone, page URL where found).
3. Extract department generic email/phone (registrar or provost department contact).
4. Extract main office email/phone.
5. Confirm/refine city and state (must be USPS 2-letter state code).
6. All emails must be valid format. All phones must be 10+ digit format.
7. For each contact found, include the source URL it was found in.
8. Provide confidence scores: state_confidence (0-1), contact_confidence (0-1).

CRITICAL:
- Do NOT fabricate contacts or email addresses.
- If not found in text, return null.
- State must be exactly 2 letters (e.g., "CA", "NY").
- Return ONLY valid JSON, no markdown or extra text.
- Include all source_urls as an array of strings.

Return valid JSON matching this exact structure (no markdown, no comments):
{
  "name": "${input.name}",
  "website": "${input.website || null}",
  "city": "string or null",
  "state": "2-letter code or null",
  "registrar_name": "string or null",
  "registrar_email": "string or null",
  "registrar_phone": "string or null",
  "registrar_page_url": "string or null",
  "provost_name": "string or null",
  "provost_email": "string or null",
  "provost_phone": "string or null",
  "provost_page_url": "string or null",
  "dept_email": "string or null",
  "dept_phone": "string or null",
  "main_office_email": "string or null",
  "main_office_phone": "string or null",
  "state_confidence": 0.0,
  "contact_confidence": 0.0,
  "source_urls": ["url1", "url2"],
  "notes": "string or null"
}`;

  try {
    if (!checkQuotaStatus()) {
      return createEmptyRow(input.name, input.website);
    }

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response');
      return createEmptyRow(input.name, input.website);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const row: SchoolRow = {
      name: parsed.name || input.name,
      website: sanitizeUrl(parsed.website) || input.website || null,
      city: parsed.city || input.seedCity || null,
      state: parsed.state ? parsed.state.toUpperCase().slice(0, 2) : (input.seedState || null),
      registrar_name: parsed.registrar_name || null,
      registrar_email: parsed.registrar_email && validateEmail(parsed.registrar_email) ? parsed.registrar_email : null,
      registrar_phone: parsed.registrar_phone && validatePhone(parsed.registrar_phone) ? parsed.registrar_phone : null,
      registrar_page_url: sanitizeUrl(parsed.registrar_page_url),
      provost_name: parsed.provost_name || null,
      provost_email: parsed.provost_email && validateEmail(parsed.provost_email) ? parsed.provost_email : null,
      provost_phone: parsed.provost_phone && validatePhone(parsed.provost_phone) ? parsed.provost_phone : null,
      provost_page_url: sanitizeUrl(parsed.provost_page_url),
      dept_email: parsed.dept_email && validateEmail(parsed.dept_email) ? parsed.dept_email : null,
      dept_phone: parsed.dept_phone && validatePhone(parsed.dept_phone) ? parsed.dept_phone : null,
      main_office_email: parsed.main_office_email && validateEmail(parsed.main_office_email) ? parsed.main_office_email : null,
      main_office_phone: parsed.main_office_phone && validatePhone(parsed.main_office_phone) ? parsed.main_office_phone : null,
      state_confidence: Math.min(1, Math.max(0, parsed.state_confidence ?? 0.5)),
      contact_confidence: Math.min(1, Math.max(0, parsed.contact_confidence ?? 0.3)),
      source_urls: Array.isArray(parsed.source_urls)
        ? Array.from(new Set(parsed.source_urls.filter((u: unknown): u is string => typeof u === 'string')))
        : [],
      notes: parsed.notes || null,
    };

    return row;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
      const retryAfterMatch = errorMessage.match(/Please retry in ([\d.]+)s/);
      const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1]) + 5 : 3600;

      lastQuotaError = {
        time: Date.now(),
        retryAfter,
      };

      console.warn(`Gemini API quota exceeded. Will retry in ${retryAfter}s`);

      return {
        name: input.name,
        website: input.website || null,
        city: input.seedCity || null,
        state: input.seedState || null,
        registrar_name: null,
        registrar_email: null,
        registrar_phone: null,
        registrar_page_url: null,
        provost_name: null,
        provost_email: null,
        provost_phone: null,
        provost_page_url: null,
        dept_email: null,
        dept_phone: null,
        main_office_email: null,
        main_office_phone: null,
        state_confidence: input.seedState ? 0.8 : 0,
        contact_confidence: 0,
        source_urls: input.website ? [input.website] : [],
        notes: `Gemini API quota exceeded. Try again after ${new Date(Date.now() + retryAfter * 1000).toLocaleTimeString()}`,
      };
    }

    console.error('Error in extractWithGemini:', error);
    return createEmptyRow(input.name, input.website);
  }
}

function createEmptyRow(name: string, website: string | null): SchoolRow {
  return {
    name,
    website: website || null,
    city: null,
    state: null,
    registrar_name: null,
    registrar_email: null,
    registrar_phone: null,
    registrar_page_url: null,
    provost_name: null,
    provost_email: null,
    provost_phone: null,
    provost_page_url: null,
    dept_email: null,
    dept_phone: null,
    main_office_email: null,
    main_office_phone: null,
    state_confidence: 0,
    contact_confidence: 0,
    source_urls: [],
    notes: 'No data extracted',
  };
}
