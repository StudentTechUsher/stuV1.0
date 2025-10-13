import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';
import {
  VALIDATION_OPTIONS,
  extractColorsSchema,
  type ExtractColorsInput,
} from '@/lib/validation/schemas';
import { extractColorsFromUrl, ColorExtractionError } from '@/lib/services/utilityService';
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

    // Extract colors using service layer
    const colors = await extractColorsFromUrl(url);

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
      if (error.message === 'Invalid URL') {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }

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