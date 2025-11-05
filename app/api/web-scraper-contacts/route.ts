import { NextRequest, NextResponse } from 'next/server';
import { InstitutionRow } from '@/lib/services/webScraperService';
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
    };

    // Start background discovery (fire and forget)
    discoverContactsInBackground(sessionId, rows).catch((error) => {
      logError('Background contact discovery failed', error, {
        action: 'discover_contacts_background',
        sessionId,
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

// Import the contact discovery function
import { searchForContactsWithAI } from '@/lib/services/webScraperService';

/**
 * Background task to discover contacts for all institutions
 */
async function discoverContactsInBackground(
  sessionId: string,
  rows: InstitutionRow[]
) {
  const state = contactDiscoveryState[sessionId];
  if (!state) return;

  const batchSize = 2; // Process 2 schools at a time
  const delayBetweenBatches = 1500; // 1.5 seconds between batches

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (row) => {
        try {
          // Search for registrar
          const registrarDept = await searchForContactsWithAI(row.name, 'Registrar');
          if (registrarDept.main_email || registrarDept.contacts.length > 0) {
            state.withRegistrar++;
            const primary = registrarDept.contacts[0];
            if (primary) {
              row.registrar_name = primary.name || null;
              row.registrar_email = primary.email || null;
            } else {
              row.registrar_email = registrarDept.main_email;
            }
          }

          // Search for provost
          const provostDept = await searchForContactsWithAI(row.name, 'Provost');
          if (provostDept.main_email || provostDept.contacts.length > 0) {
            state.withProvost++;
            const primary = provostDept.contacts[0];
            if (primary) {
              row.provost_name = primary.name || null;
              row.provost_email = primary.email || null;
            } else {
              row.provost_email = provostDept.main_email;
            }
          }

          // Check if has both
          if (
            (row.registrar_email || row.registrar_name) &&
            (row.provost_email || row.provost_name)
          ) {
            state.withBoth++;
          }

          state.processed++;
        } catch (error) {
          console.error(`Contact discovery failed for ${row.name}:`, error);
          state.processed++;
        }
      })
    );

    // Delay between batches
    if (i + batchSize < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }
}
