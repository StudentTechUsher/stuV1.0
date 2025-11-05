import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstitutions, type InstitutionRow } from '@/lib/services/webScraperService';
import { logError } from '@/lib/logger';
import ExcelJS from 'exceljs';

/**
 * POST /api/web-scraper
 * Scrapes institutions from provided URLs
 */
export async function POST(request: NextRequest) {
  return handleScrapeInstitutions(request);
}

async function handleScrapeInstitutions(request: NextRequest) {
  try {
    const body = await request.json();
    const { seedUrls } = body;

    // Validate input
    if (!seedUrls || !Array.isArray(seedUrls) || seedUrls.length === 0) {
      return NextResponse.json(
        { error: 'seedUrls must be a non-empty array of strings' },
        { status: 400 }
      );
    }

    // Validate URLs
    const validUrls: string[] = [];
    for (const url of seedUrls) {
      if (typeof url !== 'string') continue;
      try {
        new URL(url);
        validUrls.push(url);
      } catch {
        // Invalid URL, skip
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      );
    }

    // Perform scraping
    const result = await scrapeInstitutions(validUrls);

    // Generate Excel file
    const excelBase64 = await generateExcelExport(result.rows);

    // Return result with Excel data
    return NextResponse.json(
      {
        rows: result.rows,
        eta: result.eta,
        xlsx_base64: excelBase64,
        summary: result.summary,
      },
      { status: 200 }
    );
  } catch (error) {
    logError('Web scraper failed', error, {
      action: 'scrape_institutions',
    });
    return NextResponse.json(
      { error: 'Failed to scrape institutions' },
      { status: 500 }
    );
  }
}

/**
 * Generates an Excel file from institution rows
 * @param rows - Institution data
 * @returns Base64-encoded Excel file
 */
async function generateExcelExport(rows: InstitutionRow[]): Promise<string> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Institutions');

    // Define columns
    worksheet.columns = [
      { header: 'Institution Name', key: 'name', width: 30 },
      { header: 'Website', key: 'website', width: 35 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 8 },
      { header: 'Registrar Name', key: 'registrar_name', width: 20 },
      { header: 'Registrar Email', key: 'registrar_email', width: 25 },
      { header: 'Registrar Contact Form', key: 'registrar_contact_form_url', width: 35 },
      { header: 'Provost Name', key: 'provost_name', width: 20 },
      { header: 'Provost Email', key: 'provost_email', width: 25 },
      { header: 'Provost Contact Form', key: 'provost_contact_form_url', width: 35 },
      { header: 'Main Office Email', key: 'main_office_email', width: 25 },
      { header: 'Main Office Phone', key: 'main_office_phone', width: 15 },
      { header: 'Source URLs', key: 'source_urls', width: 40 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add data rows
    for (const row of rows) {
      worksheet.addRow({
        name: row.name,
        website: row.website || '',
        city: row.city || '',
        state: row.state || '',
        registrar_name: row.registrar_name || '',
        registrar_email: row.registrar_email || '',
        registrar_contact_form_url: row.registrar_contact_form_url || '',
        provost_name: row.provost_name || '',
        provost_email: row.provost_email || '',
        provost_contact_form_url: row.provost_contact_form_url || '',
        main_office_email: row.main_office_email || '',
        main_office_phone: row.main_office_phone || '',
        source_urls: row.source_urls.join('; '),
        notes: row.notes || '',
      });
    }

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert to base64
    return Buffer.from(buffer as unknown as ArrayBuffer).toString('base64');
  } catch (error) {
    logError('Failed to generate Excel export', error, {
      action: 'generate_excel_export',
    });
    return '';
  }
}
