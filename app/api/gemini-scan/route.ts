import { NextRequest, NextResponse } from 'next/server';
import { resolveCityState } from '@/lib/ipeds';
import { extractWithGemini, type SchoolRow } from '@/lib/gemini';
import { rowsToExcelBase64 } from '@/lib/excel';

interface ScanRequest {
  schools: string[];
}

interface ScanResponse {
  rows: SchoolRow[];
  xlsxBase64: string;
}

async function createEmptyRow(name: string): Promise<SchoolRow> {
  return {
    name,
    website: null,
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
    notes: 'Playwright requires server environment setup',
  };
}

async function processSchoolWithGemini(
  schoolName: string,
  scorecardKey?: string
): Promise<SchoolRow> {
  const trimmedName = schoolName.trim();

  if (!trimmedName) {
    return createEmptyRow('');
  }

  try {
    const seedResult = await resolveCityState(trimmedName, scorecardKey);
    const seedCity = seedResult?.city || null;
    const seedState = seedResult?.state || null;

    const blobs: Array<{ url: string; text: string }> = [
      {
        url: `https://www.${trimmedName.toLowerCase().replace(/\s+/g, '')}.edu`,
        text: `College/University: ${trimmedName}. Contact information would be retrieved from the institution's official website.`,
      },
    ];

    const row = await extractWithGemini({
      name: trimmedName,
      website: `https://www.${trimmedName.toLowerCase().replace(/\s+/g, '')}.edu`,
      blobs,
      seedCity,
      seedState,
    });

    return row;
  } catch (error) {
    console.error(`Error processing ${trimmedName}:`, error);
    const seedResult = await resolveCityState(trimmedName, scorecardKey);
    return {
      name: trimmedName,
      website: null,
      city: seedResult?.city || null,
      state: seedResult?.state || null,
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
      state_confidence: seedResult?.state ? 0.9 : 0,
      contact_confidence: 0,
      source_urls: [],
      notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function processBatch(schools: string[], scorecardKey?: string): Promise<SchoolRow[]> {
  const results: SchoolRow[] = [];
  const CONCURRENCY = 3;

  for (let i = 0; i < schools.length; i += CONCURRENCY) {
    const batch = schools.slice(i, i + CONCURRENCY);
    const promises = batch.map((school) => processSchoolWithGemini(school, scorecardKey));

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}

export async function POST(request: NextRequest): Promise<NextResponse<ScanResponse>> {
  try {
    const body = (await request.json()) as ScanRequest;
    const { schools } = body;

    if (!Array.isArray(schools)) {
      return NextResponse.json(
        { error: 'Invalid input: schools must be an array' } as unknown as ScanResponse,
        { status: 400 }
      );
    }

    const scorecardKey = process.env.SCORECARD_API_KEY;
    const rows = await processBatch(schools, scorecardKey);
    const xlsxBase64 = rowsToExcelBase64(rows);

    return NextResponse.json({
      rows,
      xlsxBase64,
    });
  } catch (error) {
    console.error('Error in gemini-scan:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` } as unknown as ScanResponse,
      { status: 500 }
    );
  }
}
