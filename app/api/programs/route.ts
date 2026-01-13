import { NextRequest, NextResponse } from 'next/server';
import { ProgramFetchError } from '@/lib/services/programService';
import { logError } from '@/lib/logger';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

// GET /api/programs?type=minor|major&universityId=123
export async function GET(request: NextRequest) {
  return handleGetPrograms(request);
}

async function handleGetPrograms(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined; // major | minor | emphasis | etc
    const universityIdStr = searchParams.get('universityId');
    const universityId = universityIdStr ? Number(universityIdStr) : undefined;

    // Student metadata for filtering gen_ed programs
    const admissionYearStr = searchParams.get('admissionYear');
    const studentAdmissionYear = admissionYearStr ? Number(admissionYearStr) : undefined;
    const isTransferStr = searchParams.get('isTransfer');
    const studentIsTransfer = isTransferStr === 'true' ? true : isTransferStr === 'false' ? false : undefined;

    // Create server-side Supabase client
    const supabase = await createSupabaseServerComponentClient();

    // Map query parameter to database enum value
    const programTypeMap: Record<string, string> = {
      'graduate': 'graduate_no_gen_ed',
      'major': 'major',
      'minor': 'minor',
      'gen_ed': 'gen_ed'
    };

    // Build query
    let query = supabase
      .from('program')
      .select('id,name,university_id,program_type,course_flow,requirements,applicable_start_year,applicable_end_year,applies_to_transfers,applies_to_freshmen,priority,minimum_credits,target_total_credits,program_description')
      .order('name');

    if (type) {
      // For gen_ed type, filter by is_general_ed flag instead of program_type
      if (type === 'gen_ed') {
        query = query.eq('is_general_ed', true);
      } else {
        // Map the type parameter to the actual database enum value
        const dbType = programTypeMap[type] || type;
        query = query.eq('program_type', dbType);
      }
    }

    if (universityId) {
      query = query.eq('university_id', universityId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error in fetchPrograms:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        queryParams: { type, universityId }
      });
      throw new ProgramFetchError('Failed to fetch programs', error);
    }

    let programs = data ?? [];

    // Filter gen_ed programs based on student metadata
    if (type === 'gen_ed' && (studentAdmissionYear || studentIsTransfer !== undefined)) {
      programs = programs.filter(program => {
        // Check admission year range
        if (studentAdmissionYear) {
          const startYear = program.applicable_start_year as number | null | undefined;
          const endYear = program.applicable_end_year as number | null | undefined;

          if (startYear && typeof startYear === 'number' && studentAdmissionYear < startYear) {
            return false;
          }
          if (endYear && typeof endYear === 'number' && studentAdmissionYear > endYear) {
            return false;
          }
        }

        // Check transfer status
        if (studentIsTransfer !== undefined) {
          if (studentIsTransfer && program.applies_to_transfers === false) {
            return false;
          }
          if (!studentIsTransfer && program.applies_to_freshmen === false) {
            return false;
          }
        }

        return true;
      });

      // Sort by priority (highest first) if multiple gen eds match
      programs.sort((a, b) => {
        const priorityA = typeof a.priority === 'number' ? a.priority : 0;
        const priorityB = typeof b.priority === 'number' ? b.priority : 0;
        return priorityB - priorityA;
      });
    }

    return NextResponse.json(programs);
  } catch (error) {
    if (error instanceof ProgramFetchError) {
      logError('Failed to fetch programs', error, {
        action: 'fetch_programs',
      });
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
    }

    logError('Unexpected error fetching programs', error, {
      action: 'fetch_programs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
