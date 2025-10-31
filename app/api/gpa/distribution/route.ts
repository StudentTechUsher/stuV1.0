/**
 * POST /api/gpa/distribution
 * Computes required grade distribution for target GPA
 */

import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import {
  computeDistribution,
  GPACalculationError,
} from '@/lib/services/gpaService';
import { ValidationError } from '@/lib/gpa/validation';

/**
 * Compute required grade distribution
 * Body should contain:
 * - targetGpa: number (0.0-4.0)
 * - completedCredits: number
 * - completedQualityPoints: number
 * - remaining: array of { credits, goalGrade? }
 */
async function handleComputeDistribution(_request: NextRequest) {
  try {
    const payload = await _request.json();

    const result = await computeDistribution(payload);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: {
            field: error.fieldName,
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof GPACalculationError) {
      logError('GPA distribution calculation error', error, {
        action: 'compute_distribution_api',
      });
      return NextResponse.json(
        { error: 'Failed to compute distribution' },
        { status: 500 }
      );
    }

    logError('Unexpected error in POST /api/gpa/distribution', error, {
      action: 'compute_distribution_api',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleComputeDistribution(request);
}
