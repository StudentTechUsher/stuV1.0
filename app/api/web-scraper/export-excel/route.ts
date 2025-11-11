import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { logError } from '@/lib/logger';

interface InstitutionRow {
  name: string;
  website: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  category: string;
  stu_fit_score: number;
  registrar_name: string | null;
  registrar_email: string | null;
  registrar_department_email: string | null;
  provost_name: string | null;
  provost_email: string | null;
  provost_department_email: string | null;
  main_office_email: string | null;
  main_office_phone: string | null;
  source_urls: string[];
  notes: string | null;
  [key: string]: unknown;
}

/**
 * POST /api/web-scraper/export-excel
 * Generates Excel file from provided institution rows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body as { rows: InstitutionRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'rows must be a non-empty array' },
        { status: 400 }
      );
    }

    const excelBase64 = await generateExcelExport(rows);

    return NextResponse.json({
      xlsx_base64: excelBase64,
    });
  } catch (error) {
    logError('Failed to export Excel', error, {
      action: 'export_excel',
    });
    return NextResponse.json(
      { error: 'Failed to generate Excel export' },
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
      { header: 'Registrar Email (Person)', key: 'registrar_email', width: 25 },
      { header: 'Registrar Department Email', key: 'registrar_department_email', width: 25 },
      { header: 'Registrar Contact Form', key: 'registrar_contact_form_url', width: 35 },
      { header: 'Provost Name', key: 'provost_name', width: 20 },
      { header: 'Provost Email (Person)', key: 'provost_email', width: 25 },
      { header: 'Provost Department Email', key: 'provost_department_email', width: 25 },
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
      // Format all registrar contacts into a readable string
      let registrarContactsStr = '';
      const registrarDept = row.registrar_department as unknown as any;
      if (registrarDept && Array.isArray(registrarDept.contacts)) {
        registrarContactsStr = registrarDept.contacts
          .map((c: any) => {
            const parts = [];
            if (c.name) parts.push(`Name: ${c.name}`);
            if (c.title) parts.push(`Title: ${c.title}`);
            if (c.email) parts.push(`Email: ${c.email}`);
            if (c.phone) parts.push(`Phone: ${c.phone}`);
            return parts.join(' | ');
          })
          .join(' | ');
      }

      // Format all provost contacts into a readable string
      let provostContactsStr = '';
      const provostDept = row.provost_department as unknown as any;
      if (provostDept && Array.isArray(provostDept.contacts)) {
        provostContactsStr = provostDept.contacts
          .map((c: any) => {
            const parts = [];
            if (c.name) parts.push(`Name: ${c.name}`);
            if (c.title) parts.push(`Title: ${c.title}`);
            if (c.email) parts.push(`Email: ${c.email}`);
            if (c.phone) parts.push(`Phone: ${c.phone}`);
            return parts.join(' | ');
          })
          .join(' || ');
      }

      worksheet.addRow({
        name: row.name,
        website: row.website || '',
        city: row.city || '',
        state: row.state || '',
        registrar_name: row.registrar_name || '',
        registrar_email: row.registrar_email || '',
        registrar_department_email: row.registrar_department_email || '',
        registrar_contact_form_url: row.registrar_contact_form_url || '',
        provost_name: row.provost_name || '',
        provost_email: row.provost_email || '',
        provost_department_email: row.provost_department_email || '',
        provost_contact_form_url: row.provost_contact_form_url || '',
        main_office_email: row.main_office_email || '',
        main_office_phone: row.main_office_phone || '',
        source_urls: Array.isArray(row.source_urls) ? row.source_urls.join('; ') : '',
        notes: row.notes || '',
      });

      // Add a secondary row with ALL registrar and provost contacts if they exist
      if (registrarContactsStr || provostContactsStr) {
        worksheet.addRow({
          name: `${row.name} - ALL CONTACTS`,
          website: '',
          city: '',
          state: '',
          registrar_name: registrarContactsStr ? 'ALL REGISTRAR STAFF:' : '',
          registrar_email: registrarContactsStr || '',
          registrar_department_email: '',
          registrar_contact_form_url: '',
          provost_name: provostContactsStr ? 'ALL PROVOST STAFF:' : '',
          provost_email: provostContactsStr || '',
          provost_department_email: '',
          provost_contact_form_url: '',
          main_office_email: '',
          main_office_phone: '',
          source_urls: '',
          notes: '',
        });
      }
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
