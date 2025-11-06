import { logError } from '@/lib/logger';

export interface EmailExportData {
  name: string;
  email: string;
  registrar_email?: string;
  registrar_department_email?: string;
  provost_email?: string;
  provost_department_email?: string;
  main_office_email?: string;
}

export interface InstitutionRow {
  name: string;
  website: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  category: string;
  stu_fit_score: number;
  classification_confidence: number;
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
 * AUTHORIZATION: PUBLIC
 * Extracts all unique emails from institution data
 * Only includes valid email addresses
 * @param rows - Institution data rows
 * @returns Comma-separated string of unique emails
 */
export function extractEmailsCsv(rows: InstitutionRow[]): string {
  const emailSet = new Set<string>();

  for (const row of rows) {
    const emails = [
      row.registrar_email,
      row.registrar_department_email,
      row.provost_email,
      row.provost_department_email,
      row.main_office_email,
    ];

    for (const email of emails) {
      if (email && isValidEmail(email)) {
        emailSet.add(email.toLowerCase());
      }
    }
  }

  return Array.from(emailSet).join(', ');
}

/**
 * AUTHORIZATION: PUBLIC
 * Generates CSV with names and emails for mass email marketing
 * Format: Name (First Last) in column 1, Email in column 2
 * @param rows - Institution data rows
 * @returns CSV string with headers and data
 */
export function generateNameEmailCsv(rows: InstitutionRow[]): string {
  const lines: string[] = ['Name,Email'];
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const emailPairs: { name: string; email: string }[] = [];

    // Add registrar if available
    if (row.registrar_email && isValidEmail(row.registrar_email)) {
      emailPairs.push({
        name: row.registrar_name || `${row.name} - Registrar`,
        email: row.registrar_email,
      });
    }

    // Add registrar department if different from personal email
    if (
      row.registrar_department_email &&
      isValidEmail(row.registrar_department_email) &&
      row.registrar_department_email !== row.registrar_email
    ) {
      emailPairs.push({
        name: `${row.name} - Registrar Department`,
        email: row.registrar_department_email,
      });
    }

    // Add provost if available
    if (row.provost_email && isValidEmail(row.provost_email)) {
      emailPairs.push({
        name: row.provost_name || `${row.name} - Provost`,
        email: row.provost_email,
      });
    }

    // Add provost department if different from personal email
    if (
      row.provost_department_email &&
      isValidEmail(row.provost_department_email) &&
      row.provost_department_email !== row.provost_email
    ) {
      emailPairs.push({
        name: `${row.name} - Provost Department`,
        email: row.provost_department_email,
      });
    }

    // Add main office email if available and not already added
    if (row.main_office_email && isValidEmail(row.main_office_email)) {
      const isAlreadyAdded = emailPairs.some(
        (pair) => pair.email === row.main_office_email
      );
      if (!isAlreadyAdded) {
        emailPairs.push({
          name: `${row.name} - Main Office`,
          email: row.main_office_email,
        });
      }
    }

    // Add all email pairs, avoiding duplicates
    for (const pair of emailPairs) {
      if (!seenEmails.has(pair.email.toLowerCase())) {
        seenEmails.add(pair.email.toLowerCase());
        const csvLine = `"${escapeCsvField(pair.name)}","${escapeCsvField(pair.email)}"`;
        lines.push(csvLine);
      }
    }
  }

  return lines.join('\n');
}

/**
 * AUTHORIZATION: PUBLIC
 * Parses CSV content and extracts unique emails
 * Handles both comma-separated and newline-separated formats
 * @param csvContent - Raw CSV or plain text content
 * @returns Comma-separated string of unique emails
 */
export function extractEmailsFromCsv(csvContent: string): string {
  const emailSet = new Set<string>();

  // Split by newlines to handle both CSV and plain text formats
  const lines = csvContent.split(/[\r\n]+/).filter((line) => line.trim());

  for (const line of lines) {
    // Split by comma, but respect quoted fields
    const fields = parseCSVLine(line);

    for (const field of fields) {
      const email = field.trim();
      if (isValidEmail(email)) {
        emailSet.add(email.toLowerCase());
      }
    }
  }

  return Array.from(emailSet).join(', ');
}

/**
 * AUTHORIZATION: PUBLIC
 * Validates email format using a simple regex
 * @param email - Email to validate
 * @returns True if email is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * AUTHORIZATION: INTERNAL
 * Escapes fields for CSV format (adds quotes if needed)
 * @param field - Field to escape
 * @returns Escaped field
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return field.replace(/"/g, '""');
  }
  return field;
}

/**
 * AUTHORIZATION: INTERNAL
 * Parses a CSV line respecting quoted fields
 * @param line - CSV line to parse
 * @returns Array of fields
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
