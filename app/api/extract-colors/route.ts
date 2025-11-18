import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';
import {
  VALIDATION_OPTIONS,
  extractColorsSchema,
  type ExtractColorsInput,
} from '@/lib/validation/schemas';
import { extractColorsFromUrl } from '@/lib/services/utilityService';
import { ColorExtractionError } from '@/lib/services/errors/utilityErrors';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return handleExtractColors(request);
}

async function handleExtractColors(request: NextRequest) {
  try {
    const body = await request.json();
    let parsed: ExtractColorsInput;

    try {
      parsed = await extractColorsSchema.validate(body, VALIDATION_OPTIONS);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: 'Invalid URL payload', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const url = parsed.imageUrl;
    const numColors = parsed.numColors || 5;

    // Extract colors using service layer
    const colors = await extractColorsFromUrl(url, numColors);

    if (colors.length === 0) {
      return NextResponse.json(
        {
          error: 'No colors found',
          colors: [],
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      colors,
      total: colors.length,
    });
  } catch (error) {
    if (error instanceof ColorExtractionError) {
      if (error.message === 'Invalid URL' || error.message === 'Invalid URL format') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message.includes('No colors found') || error.message.includes('No valid colors')) {
        return NextResponse.json(
          {
            error: 'No colors found',
            details: 'The page may not contain visible color definitions, or they may be loaded dynamically. Try uploading a logo image instead.',
            colors: [],
          },
          { status: 404 }
        );
      }

      console.error('Color extraction error:', error.message);
      logError('Failed to extract colors', error, {
        action: 'extract_colors',
      });
      return NextResponse.json(
        {
          error: 'Failed to extract colors',
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.error('Unexpected error extracting colors:', error);
    logError('Unexpected error extracting colors', error, {
      action: 'extract_colors',
    });
    return NextResponse.json(
      {
        error: 'Failed to extract colors',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}