import { NextRequest, NextResponse } from 'next/server';
import { InstitutionRow } from '@/lib/services/webScraperService';
import { discoverInstitutionContacts } from '@/lib/services/contactDiscoveryService';
import { logError } from '@/lib/logger';

// Store in-progress contact discoveries
const contactDiscoveryState: Record<
  string,
  {
    total: number;
    processed: number;
    withRegistrar: number;
    withProvost: number;
    withBoth: number;
    rows: InstitutionRow[];
    elapsedSeconds: number;
    estimatedTimeRemaining: number;
    estimatedCreditsUsed: number;
    currentInstitution: string;
  }
> = {};

/**
 * POST /api/web-scraper-contacts
 * Starts background contact discovery for institutions
 */
export async function POST(request: NextRequest) {
  return handleStartContactDiscovery(request);
}

/**
 * GET /api/web-scraper-contacts?sessionId=xxx
 * Gets progress of ongoing contact discovery
 */
export async function GET(request: NextRequest) {
  return handleGetProgress(request);
}

async function handleStartContactDiscovery(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, sessionId } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'rows must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Initialize state
    contactDiscoveryState[sessionId] = {
      total: rows.length,
      processed: 0,
      withRegistrar: 0,
      withProvost: 0,
      withBoth: 0,
      rows: rows.map((r) => ({ ...r })), // Deep copy
      elapsedSeconds: 0,
      estimatedTimeRemaining: 0,
      estimatedCreditsUsed: 0,
      currentInstitution: '',
    };

    // Start background discovery (fire and forget)
    discoverContactsInBackground(sessionId).catch((error) => {
      logError('Background contact discovery failed', error, {
        action: 'discover_contacts_background',
      });
    });

    return NextResponse.json({
      sessionId,
      message: 'Contact discovery started',
    });
  } catch (error) {
    logError('Failed to start contact discovery', error, {
      action: 'start_contact_discovery',
    });
    return NextResponse.json(
      { error: 'Failed to start contact discovery' },
      { status: 500 }
    );
  }
}

async function handleGetProgress(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const state = contactDiscoveryState[sessionId];
    if (!state) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      total: state.total,
      processed: state.processed,
      withRegistrar: state.withRegistrar,
      withProvost: state.withProvost,
      withBoth: state.withBoth,
      isComplete: state.processed >= state.total,
      elapsedSeconds: state.elapsedSeconds,
      estimatedTimeRemaining: state.estimatedTimeRemaining,
      estimatedCreditsUsed: state.estimatedCreditsUsed.toFixed(4),
      currentInstitution: state.currentInstitution,
      rows: state.rows,
    });
  } catch (error) {
    logError('Failed to get contact discovery progress', error, {
      action: 'get_contact_discovery_progress',
    });
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}

/**
 * Background task to discover contacts for all institutions using OpenAI
 * Processes institutions sequentially with progress tracking
 *
 * Strategy: One API call per institution (both registrar + provost in one request)
 * Cost: ~1 API call per school (vs previous 2 with Gemini)
 * Speed: ~5-10 seconds per institution
 */
async function discoverContactsInBackground(sessionId: string) {
  const state = contactDiscoveryState[sessionId];
  if (!state) return;

  const startTime = Date.now();
  state.elapsedSeconds = 0;
  state.estimatedTimeRemaining = 0;
  state.estimatedCreditsUsed = 0;
  state.currentInstitution = '';

  // Estimate: ~0.003 credits per API call (rough estimate for GPT-4)
  const creditsPerCall = 0.003;

  for (let i = 0; i < state.rows.length; i++) {
    const row = state.rows[i];
    state.currentInstitution = row.name;

    try {
      // Single OpenAI call finds both registrar and provost
      const contacts = await discoverInstitutionContacts(row.name, row.website);

      // Extract registrar info
      if (contacts.registrar.main_email || contacts.registrar.contacts.length > 0) {
        state.withRegistrar++;
        // Store full registrar department info (all contacts) - use the raw API response
        row.registrar_department = contacts.registrar as unknown as any;
        // Store department email
        if (contacts.registrar.main_email) {
          row.registrar_department_email = contacts.registrar.main_email;
        }
        // Store individual person info (for easy table display)
        const primary = contacts.registrar.contacts[0];
        if (primary?.name) {
          row.registrar_name = primary.name;
        }
        if (primary?.email) {
          row.registrar_email = primary.email;
        }
      }

      // Extract provost info
      if (contacts.provost.main_email || contacts.provost.contacts.length > 0) {
        state.withProvost++;
        // Store full provost department info (all contacts) - use the raw API response
        row.provost_department = contacts.provost as unknown as any;
        // Store department email
        if (contacts.provost.main_email) {
          row.provost_department_email = contacts.provost.main_email;
        }
        // Store individual person info (for easy table display)
        const primary = contacts.provost.contacts[0];
        if (primary?.name) {
          row.provost_name = primary.name;
        }
        if (primary?.email) {
          row.provost_email = primary.email;
        }
      }

      // Check if has both departments
      if (
        (row.registrar_email || row.registrar_name) &&
        (row.provost_email || row.provost_name)
      ) {
        state.withBoth++;
      }

      state.processed++;

      // Update timing and cost estimates
      const elapsedMs = Date.now() - startTime;
      state.elapsedSeconds = Math.ceil(elapsedMs / 1000);

      const avgTimePerInstitution = elapsedMs / (i + 1);
      const remainingCount = state.rows.length - (i + 1);
      state.estimatedTimeRemaining = Math.ceil((remainingCount * avgTimePerInstitution) / 1000);

      state.estimatedCreditsUsed = (i + 1) * creditsPerCall;

      // Rate limit: 1 second between requests
      if (i < state.rows.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Contact discovery failed for ${row.name}:`, error);
      state.processed++;

      // Update estimates even on error
      const elapsedMs = Date.now() - startTime;
      state.elapsedSeconds = Math.ceil(elapsedMs / 1000);

      const avgTimePerInstitution = elapsedMs / (i + 1);
      const remainingCount = state.rows.length - (i + 1);
      state.estimatedTimeRemaining = Math.ceil((remainingCount * avgTimePerInstitution) / 1000);

      state.estimatedCreditsUsed = (i + 1) * creditsPerCall;
    }
  }
}
