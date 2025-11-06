import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import ExcelJS from 'exceljs';
import {
  extractEmailsCsv,
  generateNameEmailCsv,
  extractEmailsFromCsv,
  type InstitutionRow,
} from '@/lib/services/emailExtractionService';

interface RequestBody {
  mode: 'emails-only' | 'name-email' | 'from-excel' | 'from-text';
  rows?: InstitutionRow[];
  csvContent?: string;
  textContent?: string;
}

/**
 * POST /api/web-scraper/extract-emails
 * Extracts emails from institution data or uploaded files
 * Supports three modes:
 * 1. emails-only: Returns comma-separated emails from current data
 * 2. name-email: Returns CSV with names and emails for mass email marketing
 * 3. from-excel: Parses uploaded Excel/CSV file and extracts unique emails
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let result = '';

    // Handle FormData (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'file is required' },
          { status: 400 }
        );
      }

      result = await extractEmailsFromFile(file);
    } else {
      // Handle JSON (data extraction)
      const body = (await request.json()) as RequestBody;
      const { mode, rows, csvContent, textContent } = body;

      if (!mode) {
        return NextResponse.json(
          { error: 'mode is required (emails-only, name-email, or from-excel)' },
          { status: 400 }
        );
      }

      if (mode === 'emails-only') {
        if (!rows || !Array.isArray(rows)) {
          return NextResponse.json(
            { error: 'rows array is required for emails-only mode' },
            { status: 400 }
          );
        }
        result = extractEmailsCsv(rows);
      } else if (mode === 'name-email') {
        if (!rows || !Array.isArray(rows)) {
          return NextResponse.json(
            { error: 'rows array is required for name-email mode' },
            { status: 400 }
          );
        }
        result = generateNameEmailCsv(rows);
      } else if (mode === 'from-excel') {
        if (!csvContent || typeof csvContent !== 'string') {
          return NextResponse.json(
            { error: 'csvContent string is required for from-excel mode' },
            { status: 400 }
          );
        }
        result = extractEmailsFromCsv(csvContent);
      } else if (mode === 'from-text') {
        if (!textContent || typeof textContent !== 'string') {
          return NextResponse.json(
            { error: 'textContent string is required for from-text mode' },
            { status: 400 }
          );
        }
        result = extractEmailsFromText(textContent);
      } else {
        return NextResponse.json(
          { error: 'Invalid mode. Must be emails-only, name-email, from-excel, or from-text' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logError('Failed to extract emails', error, {
      action: 'extract_emails',
    });
    return NextResponse.json(
      { error: 'Failed to extract emails' },
      { status: 500 }
    );
  }
}

/**
 * Extract emails from uploaded file (Excel or CSV)
 * @param file - Uploaded file
 * @returns Comma-separated emails
 */
async function extractEmailsFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const emailSet = new Set<string>();

  // Check file type and handle accordingly
  if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
    // Handle Excel files
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Iterate through all worksheets
    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          const value = cell.value;
          if (value && typeof value === 'string') {
            const email = value.trim();
            if (isValidEmail(email)) {
              emailSet.add(email.toLowerCase());
            }
          }
        });
      });
    });
  } else {
    // Handle CSV/TXT files as text
    const text = new TextDecoder().decode(buffer);
    const lines = text.split(/[\r\n]+/).filter((line) => line.trim());

    for (const line of lines) {
      const fields = parseCSVLine(line);
      for (const field of fields) {
        const email = field.trim();
        if (isValidEmail(email)) {
          emailSet.add(email.toLowerCase());
        }
      }
    }
  }

  return Array.from(emailSet).join(', ');
}


/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract emails from pasted text/chunk
 * Removes any extra symbols and deduplicates
 */
function extractEmailsFromText(text: string): string {
  const emailSet = new Set<string>();

  // Find all potential emails using regex
  // This pattern matches email-like strings
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);

  if (matches) {
    for (const email of matches) {
      const cleanedEmail = email.toLowerCase().trim();
      if (isValidEmail(cleanedEmail)) {
        emailSet.add(cleanedEmail);
      }
    }
  }

  // Also try splitting by common separators
  const separators = /[\s,;|\n\r()[\]{}<>]/;
  const tokens = text.split(separators);

  for (const token of tokens) {
    const cleaned = token.trim();
    if (cleaned && isValidEmail(cleaned)) {
      emailSet.add(cleaned.toLowerCase());
    }
  }

  return Array.from(emailSet).join(', ');
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
