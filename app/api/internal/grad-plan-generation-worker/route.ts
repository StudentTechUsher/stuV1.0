import { NextRequest, NextResponse } from 'next/server';
import { runGenerationJobsWorkerCycle } from '@/lib/services/gradPlanGenerationJobService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(request: NextRequest): boolean {
  const cronHeader = request.headers.get('x-vercel-cron');
  if (cronHeader) {
    return true;
  }

  const configuredSecret = process.env.GRAD_PLAN_GENERATION_WORKER_SECRET;
  if (!configuredSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const workerSecret = request.headers.get('x-worker-secret');
  if (workerSecret && workerSecret === configuredSecret) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token === configuredSecret;
}

async function runWorker(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const limitRaw = request.nextUrl.searchParams.get('limit');
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 3;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 25
    ? parsedLimit
    : 3;

  const processed = await runGenerationJobsWorkerCycle(limit);
  return NextResponse.json({
    success: true,
    processed,
  });
}

export async function POST(request: NextRequest) {
  try {
    return await runWorker(request);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run generation worker',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return await runWorker(request);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run generation worker',
      },
      { status: 500 }
    );
  }
}

