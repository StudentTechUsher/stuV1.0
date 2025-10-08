/**
 * Assumptions:
 * - POST /api/careers/publish publishes a draft career
 * - Body contains { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { publishCareer } from '@/lib/mocks/careers.seed';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing career ID' }, { status: 400 });
    }

    const published = publishCareer(id);

    return NextResponse.json({ career: published });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to publish career', details: String(error) },
      { status: 500 }
    );
  }
}
