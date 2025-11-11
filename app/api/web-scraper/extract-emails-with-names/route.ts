import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import ExcelJS from 'exceljs';

/**
 * POST /api/web-scraper/extract-emails-with-names
 * Extracts emails with associated names from uploaded Excel/CSV files
 * Returns CSV format with Email and Name columns
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'File upload required' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      );
    }

    const result = await extractNameEmailPairsFromFile(file);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logError('Failed to extract emails with names', error, {
      action: 'extract_emails_with_names',
    });
    return NextResponse.json(
      { error: 'Failed to extract emails with names' },
      { status: 500 }
    );
  }
}

/**
 * Extract name+email pairs from file, preserving structure
 * @param file - Uploaded file
 * @returns CSV string with email and name columns
 */
async function extractNameEmailPairsFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const lines: string[] = ['Email,Name'];
  const seenEmails = new Set<string>();

  if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
    // Handle Excel files - extract all cells and try to match names with emails
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    workbook.eachSheet((worksheet) => {
      // Collect all cells with values
      const rows: string[][] = [];
      worksheet.eachRow((row) => {
        const rowData: string[] = [];
        row.eachCell((cell) => {
          const value = cell.value;
          rowData.push(value && typeof value === 'string' ? value.trim() : '');
        });
        if (rowData.some(v => v)) {
          rows.push(rowData);
        }
      });

      // Process rows to find name+email pairs
      for (const row of rows) {
        // Look for emails in this row
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          if (isValidEmail(cell)) {
            const email = cell.toLowerCase();
            if (!seenEmails.has(email)) {
              seenEmails.add(email);

              // Try to find a name in this row
              let name = '';
              // Check adjacent cells for potential names
              if (i > 0 && row[i - 1] && !isValidEmail(row[i - 1])) {
                name = row[i - 1];
              } else if (i < row.length - 1 && row[i + 1] && !isValidEmail(row[i + 1])) {
                name = row[i + 1];
              }

              lines.push(`"${email}","${escapeCsvField(name)}"`);
            }
          }
        }
      }
    });
  } else {
    // Handle CSV/TXT files
    const text = new TextDecoder().decode(buffer);
    const csvLines = text.split(/[\r\n]+/).filter((line) => line.trim());

    for (const line of csvLines) {
      const fields = parseCSVLine(line);

      // Look for emails in this line
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i].trim();
        if (isValidEmail(field)) {
          const email = field.toLowerCase();
          if (!seenEmails.has(email)) {
            seenEmails.add(email);

            // Try to find a name in this line
            let name = '';
            if (i > 0 && fields[i - 1] && !isValidEmail(fields[i - 1])) {
              name = fields[i - 1];
            } else if (i < fields.length - 1 && fields[i + 1] && !isValidEmail(fields[i + 1])) {
              name = fields[i + 1];
            }

            lines.push(`"${email}","${escapeCsvField(name)}"`);
          }
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Escapes CSV field values
 */
function escapeCsvField(field: string): string {
  if (!field) return '';
  return field.replace(/"/g, '""');
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parses a CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add final field
  if (currentField || fields.length > 0) {
    fields.push(currentField.trim());
  }

  return fields.filter((field) => field.length > 0);
}
