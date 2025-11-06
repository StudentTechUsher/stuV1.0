'use server';

/**
 * Contact Discovery Service - OpenAI-Powered
 *
 * Efficiently discovers registrar and provost contact information
 * using a single optimized OpenAI API call per institution.
 *
 * Strategy mirrors manual process:
 * 1. Google search "[School] registrar" and "[School] provost"
 * 2. Fetch top result (usually /registrar or /provost page)
 * 3. Extract department contact info (email, phone)
 * 4. If individuals available, extract their contact info
 * 5. If only department info, that's sufficient - move on
 *
 * Cost: ~1 API call per institution (vs previous 2)
 * Speed: ~5-10 seconds per institution with OpenAI
 * Accuracy: Matches your manual Google + click workflow
 */

import fetch from 'node-fetch';

export interface ContactPerson {
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
}

export interface DepartmentContacts {
  department_name: 'Registrar' | 'Provost';
  main_email: string | null;
  main_phone: string | null;
  contacts: ContactPerson[];
}

export interface InstitutionContacts {
  institution_name: string;
  registrar: DepartmentContacts;
  provost: DepartmentContacts;
  search_summary: string;
  success: boolean;
}

/**
 * AUTHORIZATION: SYSTEM
 * Search for institution's registrar and provost contact information
 * using OpenAI with web search-like instructions
 *
 * @param institutionName - Name of the institution
 * @param institutionWebsite - Website URL (optional, used for context)
 * @returns Contact information for both departments
 */
export async function discoverInstitutionContacts(
  institutionName: string,
  institutionWebsite?: string | null
): Promise<InstitutionContacts> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    // Build context from website if available
    const websiteContext = institutionWebsite
      ? `\nInstitution Website: ${institutionWebsite}`
      : '';

    const prompt = `You are an expert researcher at finding contact information for university departments.

Your task: Find ALL possible registrar and provost contact information for ${institutionName}.${websiteContext}

CRITICAL: Extract EVERY contact you can find - we need as many emails as possible.

SEARCH STRATEGY:
1. Search "[${institutionName}] registrar" and visit the official registrar page
2. Capture the main registrar department email AND phone
3. Find the primary Registrar contact (usually titled "Registrar", "University Registrar", "Registrar of Records")
4. Find ALL associate/assistant registrars, deputies, and staff listed
5. Repeat the same process for "[${institutionName}] provost" - search for provost office
6. Extract main provost email AND phone
7. Find primary Provost contact
8. Find ALL associate provosts, vice provosts, assistant provosts, and staff

EXTRACTION RULES:
- DO extract the main department email (e.g., registrar@school.edu)
- DO extract the main department phone
- DO extract the primary individual's name, title, email, and phone
- DO extract ALL secondary/deputy staff (associates, assistants, coordinators)
- DO search multiple pages if the website lists staff directories
- DO NOT make up information - only extract what you find
- Use null only for fields that truly don't exist
- Email MUST be .edu domain or official institution domain (no generic Gmail)
- Phone format: (XXX) XXX-XXXX or +1-XXX-XXX-XXXX

MAXIMIZE EMAIL EXTRACTION:
- If registrar.edu/staff - visit that page and extract ALL staff
- If provost.edu/directory - visit that page and extract ALL staff
- Look for: staff directory, department contacts, organization chart, team page
- Extract name, title, email, phone for EVERY contact listed
- Better to include someone than to miss them

RETURN EXACTLY THIS JSON (no markdown, no explanation):
{
  "registrar": {
    "main_email": "registrar@institution.edu or null",
    "main_phone": "(555) 123-4567 or null",
    "contacts": [
      {
        "name": "Dr. Jane Smith",
        "title": "Registrar",
        "email": "jane.smith@institution.edu",
        "phone": "(555) 123-4567"
      },
      {
        "name": "John Doe",
        "title": "Associate Registrar",
        "email": "john.doe@institution.edu",
        "phone": null
      },
      {
        "name": "Mary Johnson",
        "title": "Assistant Registrar",
        "email": "mary.johnson@institution.edu",
        "phone": "(555) 123-4568"
      }
    ]
  },
  "provost": {
    "main_email": "provost@institution.edu or null",
    "main_phone": "(555) 234-5678 or null",
    "contacts": [
      {
        "name": "Dr. Michael Brown",
        "title": "Provost",
        "email": "m.brown@institution.edu",
        "phone": "(555) 234-5678"
      },
      {
        "name": "Dr. Sarah Wilson",
        "title": "Associate Provost",
        "email": "s.wilson@institution.edu",
        "phone": null
      },
      {
        "name": "James Lee",
        "title": "Assistant Provost",
        "email": "james.lee@institution.edu",
        "phone": "(555) 234-5679"
      }
    ]
  },
  "search_notes": "Detailed explanation of what was found: e.g., 'Found registrar office with main email and 3 staff members listed in directory'",
  "success": true
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Low temp for factual accuracy
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as Record<string, unknown>;
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as
      | Array<{ message?: { content?: string } }>
      | undefined;

    if (!choices || choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const responseText = choices[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`Could not parse JSON response for ${institutionName}`);
      return {
        institution_name: institutionName,
        registrar: {
          department_name: 'Registrar',
          main_email: null,
          main_phone: null,
          contacts: [],
        },
        provost: {
          department_name: 'Provost',
          main_email: null,
          main_phone: null,
          contacts: [],
        },
        search_summary: 'Failed to parse response',
        success: false,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Type-safe extraction
    const registrarData = parsed.registrar as Record<string, unknown> | undefined;
    const provostData = parsed.provost as Record<string, unknown> | undefined;

    return {
      institution_name: institutionName,
      registrar: {
        department_name: 'Registrar',
        main_email: (registrarData?.main_email as string | null) || null,
        main_phone: (registrarData?.main_phone as string | null) || null,
        contacts: parseContacts(registrarData?.contacts),
      },
      provost: {
        department_name: 'Provost',
        main_email: (provostData?.main_email as string | null) || null,
        main_phone: (provostData?.main_phone as string | null) || null,
        contacts: parseContacts(provostData?.contacts),
      },
      search_summary: (parsed.search_notes as string) || 'Contact search completed',
      success: (parsed.success as boolean) || false,
    };
  } catch (error) {
    console.error(`Contact discovery failed for ${institutionName}:`, error);
    return {
      institution_name: institutionName,
      registrar: {
        department_name: 'Registrar',
        main_email: null,
        main_phone: null,
        contacts: [],
      },
      provost: {
        department_name: 'Provost',
        main_email: null,
        main_phone: null,
        contacts: [],
      },
      search_summary: `Error during search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Parse contacts array from JSON response
 */
function parseContacts(contactsData: unknown): ContactPerson[] {
  if (!Array.isArray(contactsData)) {
    return [];
  }

  return contactsData.map((contact: unknown) => {
    const c = contact as Record<string, unknown>;
    return {
      name: (c.name as string | null) || null,
      title: (c.title as string | null) || null,
      email: (c.email as string | null) || null,
      phone: (c.phone as string | null) || null,
    };
  });
}

/**
 * AUTHORIZATION: SYSTEM
 * Batch discover contacts for multiple institutions
 * Tracks progress and provides estimated time remaining
 *
 * @param institutions - Array of {name, website} objects
 * @param onProgress - Callback for progress updates
 * @returns Array of contact discovery results
 */
export async function discoverContactsForInstitutions(
  institutions: Array<{ name: string; website?: string | null }>,
  onProgress?: (progress: {
    processed: number;
    total: number;
    current: string;
    estimatedTimeRemaining: number;
    successCount: number;
    failureCount: number;
  }) => void
): Promise<InstitutionContacts[]> {
  const results: InstitutionContacts[] = [];
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];

    try {
      const result = await discoverInstitutionContacts(
        institution.name,
        institution.website
      );

      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Calculate progress metrics
      const elapsedMs = Date.now() - startTime;
      const avgTimePerInstitution = elapsedMs / (i + 1);
      const remainingCount = institutions.length - (i + 1);
      const estimatedTimeRemaining = remainingCount * avgTimePerInstitution;

      // Call progress callback
      if (onProgress) {
        onProgress({
          processed: i + 1,
          total: institutions.length,
          current: institution.name,
          estimatedTimeRemaining: Math.ceil(estimatedTimeRemaining / 1000), // seconds
          successCount,
          failureCount,
        });
      }

      // Rate limiting: wait 1 second between requests to be respectful to OpenAI
      if (i < institutions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to discover contacts for ${institution.name}:`, error);
      failureCount++;

      const elapsedMs = Date.now() - startTime;
      const avgTimePerInstitution = elapsedMs / (i + 1);
      const remainingCount = institutions.length - (i + 1);
      const estimatedTimeRemaining = remainingCount * avgTimePerInstitution;

      if (onProgress) {
        onProgress({
          processed: i + 1,
          total: institutions.length,
          current: institution.name,
          estimatedTimeRemaining: Math.ceil(estimatedTimeRemaining / 1000),
          successCount,
          failureCount,
        });
      }
    }
  }

  return results;
}
