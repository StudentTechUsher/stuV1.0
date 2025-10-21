/**
 * PDF text extraction utilities for transcript parsing
 */

import { logError } from '@/lib/logger';

export class PdfExtractionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

/**
 * Extract text content from a PDF buffer
 * @param pdfBuffer - Buffer containing PDF data
 * @returns Extracted text content
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use pdfjs-dist which works reliably in Next.js
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    const textPages: string[] = [];

    // Extract text from each page
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      textPages.push(pageText);
    }

    return textPages.join('\n');
  } catch (error) {
    logError('PDF text extraction failed', error, {
      action: 'pdf_text_extraction',
    });
    throw new PdfExtractionError('Failed to extract text from PDF', error);
  }
}

/**
 * Extract the BYU COURSE WORK section from transcript text
 * @param text - Full transcript text
 * @returns Text starting from "BYU COURSE WORK" section, or full text if not found
 */
export function extractByuCourseWorkSection(text: string): string {
  const marker = 'BYU COURSE WORK';
  const index = text.indexOf(marker);

  if (index === -1) {
    // Marker not found - might not be a BYU transcript
    return text;
  }

  return text.substring(index);
}

/**
 * Extract text from PDF and locate BYU COURSE WORK section
 * @param pdfBuffer - Buffer containing PDF data
 * @returns Text from BYU COURSE WORK section
 */
export async function extractByuTranscriptText(pdfBuffer: Buffer): Promise<string> {
  const fullText = await extractTextFromPdf(pdfBuffer);
  const trimmed = fullText.length > 100 ? fullText.slice(100) : fullText;
  return extractByuCourseWorkSection(trimmed);
}

/**
 * Clean BYU transcript text by removing irrelevant content
 * Primarily focuses on removing PII (Personal Identifiable Information) from the header
 * @param text - Raw transcript text
 * @returns Cleaned text with only relevant course work sections
 */
export function cleanByuTranscriptText(text: string): string {
  let cleaned = text;

  // Find "BYU COURSE WORK" and remove everything before it (this removes all PII)
  const marker = 'BYU COURSE WORK';
  const markerIndex = cleaned.indexOf(marker);

  if (markerIndex !== -1) {
    // Start from AFTER "BYU COURSE WORK" (skip the header itself)
    cleaned = cleaned.substring(markerIndex + marker.length);
  }

  // Process line by line to remove specific unwanted patterns
  const lines = cleaned.split('\n');
  const filteredLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed.length === 0) continue;

    // Skip lines with only dashes (consecutive - marks)
    if (/^-+$/.test(trimmed)) continue;

    // Skip lines that are summary stats (TRN HR ERN, TOT HR ERN patterns)
    if (/^(TRN|TOT)\s+HR\s+ERN/.test(trimmed)) continue;

    // Keep everything else
    filteredLines.push(trimmed);
  }

  // Join lines back together with newlines
  cleaned = filteredLines.join('\n');

  return cleaned.trim();
}
