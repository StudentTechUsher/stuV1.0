/**
 * Assumptions:
 * - GET /api/careers/[slug] returns a single career
 * - 404 if not found
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedCareers, getCareerBySlug } from '@/lib/mocks/careers.seed';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  seedCareers();

  const career = getCareerBySlug(params.slug);

  if (!career) {
    return NextResponse.json({ error: 'Career not found' }, { status: 404 });
  }

  return NextResponse.json({ career });
}
