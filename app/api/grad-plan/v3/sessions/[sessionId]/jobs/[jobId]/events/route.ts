import { NextRequest } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import {
  getV3GenerationJobSnapshot,
  isTerminalV3GenerationStatus,
  listV3GenerationJobEvents,
} from '@/lib/services/gradPlanV3GenerationJobService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractIds(pathname: string): { sessionId: string; jobId: string } {
  const parts = pathname.split('/');
  const sessionsMarker = parts.indexOf('sessions');
  const jobsMarker = parts.indexOf('jobs');

  return {
    sessionId: sessionsMarker >= 0 ? parts[sessionsMarker + 1] ?? '' : '',
    jobId: jobsMarker >= 0 ? parts[jobsMarker + 1] ?? '' : '',
  };
}

function parseEventId(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const user = await getVerifiedUser();
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { sessionId, jobId } = extractIds(request.nextUrl.pathname);
  if (!sessionId || !jobId) {
    return new Response(JSON.stringify({ success: false, error: 'sessionId and jobId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const snapshot = await getV3GenerationJobSnapshot({ jobId, userId: user.id, sessionId });
  if (!snapshot) {
    return new Response(JSON.stringify({ success: false, error: 'Job not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const queryAfterId = parseEventId(request.nextUrl.searchParams.get('afterId'));
  const headerAfterId = parseEventId(request.headers.get('last-event-id'));
  let cursor = Math.max(queryAfterId, headerAfterId);

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let idlePolls = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        controller.close();
      };

      const poll = async () => {
        if (closed) return;

        try {
          const [events, latestSnapshot] = await Promise.all([
            listV3GenerationJobEvents({
              jobId,
              userId: user.id,
              afterId: cursor,
              limit: 200,
            }),
            getV3GenerationJobSnapshot({ jobId, userId: user.id, sessionId }),
          ]);

          if (!latestSnapshot) {
            closeStream();
            return;
          }

          if (events.length > 0) {
            idlePolls = 0;
            for (const event of events) {
              cursor = Math.max(cursor, event.id);
              send(`id: ${event.id}\n`);
              send(`data: ${JSON.stringify(event)}\n\n`);
            }
          } else {
            idlePolls += 1;
            if (idlePolls >= 5) {
              idlePolls = 0;
              send(`: heartbeat ${new Date().toISOString()}\n\n`);
            }
          }

          if (isTerminalV3GenerationStatus(latestSnapshot.status)) {
            closeStream();
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to stream v3 generation events';
          send('event: error\n');
          send(`data: ${JSON.stringify({ error: message })}\n\n`);
          closeStream();
        }
      };

      send('retry: 2000\n\n');
      void poll();
      interval = setInterval(() => {
        void poll();
      }, 1000);

      request.signal.addEventListener(
        'abort',
        () => {
          closeStream();
        },
        { once: true }
      );
    },
    cancel() {
      closed = true;
      if (interval) {
        clearInterval(interval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
