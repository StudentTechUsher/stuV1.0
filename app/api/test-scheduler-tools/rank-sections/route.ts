import { NextRequest, NextResponse } from 'next/server';
import { rankSectionsByPreferences } from '@/lib/mastra/tools/courseSelectionTools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sections, preferences } = body;

    // Validate inputs
    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Missing or invalid sections array' },
        { status: 400 }
      );
    }

    console.log('🧪 [TEST API] Testing rankSectionsByPreferences:', {
      sectionCount: sections.length,
      preferences,
    });

    // Rank sections
    const rankedSections = await rankSectionsByPreferences(
      sections,
      preferences || {}
    );

    return NextResponse.json({
      success: true,
      rankedSections,
      count: rankedSections.length,
      topSection: rankedSections[0] || null,
    });
  } catch (error) {
    console.error('❌ [TEST API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
