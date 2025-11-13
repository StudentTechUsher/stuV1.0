import { NextRequest, NextResponse } from 'next/server';
import {
  bulkInsertCourseOfferings,
  deleteCourseOfferingsByTerm,
  CourseOfferingValidationError,
  CourseOfferingInsertError,
  RawCourseData,
} from '@/lib/services/courseOfferingService';

/**
 * PASSWORD PROTECTED: Upload course offerings from JSON file
 *
 * Security measures:
 * 1. Requires COURSE_UPLOAD_PASSWORD header for authentication
 * 2. Input validation and sanitization in service layer
 * 3. Batch processing with limits
 * 4. Hash-based deduplication
 */
export async function POST(request: NextRequest) {
  return handleUploadCourses(request);
}

async function handleUploadCourses(request: NextRequest) {
  // Security Check: Require password
  const providedPassword = request.headers.get('x-upload-password');
  const expectedPassword = process.env.COURSE_UPLOAD_PASSWORD;

  if (!expectedPassword) {
    console.error('COURSE_UPLOAD_PASSWORD not configured in environment');
    return NextResponse.json(
      { error: 'Upload endpoint not properly configured' },
      { status: 500 }
    );
  }

  if (!providedPassword || providedPassword !== expectedPassword) {
    console.warn('Unauthorized course upload attempt');
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing password' },
      { status: 401 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const { courses, universityId, replaceTerm } = body;

    // Validate required fields
    if (!courses || !Array.isArray(courses)) {
      return NextResponse.json(
        { error: 'Missing or invalid "courses" array in request body' },
        { status: 400 }
      );
    }

    if (!universityId || typeof universityId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid "universityId" in request body' },
        { status: 400 }
      );
    }

    // Optional: Delete existing courses for this term first
    let deletedCount = 0;
    if (replaceTerm && typeof replaceTerm === 'string') {
      console.log(`Deleting existing courses for term: ${replaceTerm}`);
      const deleteResult = await deleteCourseOfferingsByTerm(universityId, replaceTerm);
      deletedCount = deleteResult.deleted;
      console.log(`Deleted ${deletedCount} existing course offerings`);
    }

    // Validate and insert courses
    console.log(`Starting bulk insert of ${courses.length} course offerings...`);
    const result = await bulkInsertCourseOfferings(
      courses as RawCourseData[],
      universityId
    );

    console.log(`Upload complete: ${result.inserted} inserted, ${result.errors} errors`);

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      inserted: result.inserted,
      validationErrors: result.errors,
      errorDetails: result.errorDetails,
      message: `Successfully processed ${result.inserted} courses${deletedCount > 0 ? ` (replaced ${deletedCount} existing)` : ''}`,
    });
  } catch (error) {
    console.error('Course upload error:', error);

    if (error instanceof CourseOfferingValidationError) {
      return NextResponse.json(
        { error: error.message, type: 'validation' },
        { status: 400 }
      );
    }

    if (error instanceof CourseOfferingInsertError) {
      return NextResponse.json(
        { error: error.message, type: 'database' },
        { status: 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during upload' },
      { status: 500 }
    );
  }
}

/**
 * Get upload endpoint information
 */
export async function GET(_request: NextRequest) {
  return handleGetUploadStats();
}

async function handleGetUploadStats() {
  return NextResponse.json({
    available: true,
    message: 'Course upload endpoint is available',
    usage: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-upload-password': 'your-password',
      },
      body: {
        courses: 'Array of course objects from JSON file',
        universityId: 'number (e.g., 1 for BYU)',
        replaceTerm: 'optional string (e.g., "Winter 2026") - deletes existing courses for this term before inserting',
      },
    },
  });
}
