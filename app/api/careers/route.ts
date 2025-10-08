/**
 * Assumptions:
 * - GET /api/careers?search=... returns all or filtered careers
 * - Uses in-memory seed data for PoC
 * - TODO: Replace with database queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedCareers, listCareers, searchCareers } from '@/lib/mocks/careers.seed';

export async function GET(request: NextRequest) {
  seedCareers();

  const { searchParams } = request.nextUrl;
  const searchQuery = searchParams.get('search');

  const careers = searchQuery ? searchCareers(searchQuery) : listCareers();

  return NextResponse.json({ careers });
}
