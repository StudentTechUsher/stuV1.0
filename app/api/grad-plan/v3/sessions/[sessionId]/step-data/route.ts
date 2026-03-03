import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { getV3Session } from '@/lib/services/gradPlanV3ContextService';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { fetchUserCoursesArray } from '@/lib/services/userCoursesService';
import {
  buildProgramRequirements,
  normalizeProgramsForV3,
  normalizeTranscriptCourses,
  type PipelineProgramRow,
} from '@/lib/grad-plan/v3/dataPipeline';
import type { SelectedCourseItem } from '@/lib/chatbot/grad-plan/v3/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractSessionId(pathname: string): string {
  const parts = pathname.split('/');
  const marker = parts.indexOf('sessions');
  if (marker < 0) return '';
  return parts[marker + 1] ?? '';
}

function dedupeCourses(courses: SelectedCourseItem[]): SelectedCourseItem[] {
  const seen = new Set<string>();
  const deduped: SelectedCourseItem[] = [];
  for (const course of courses) {
    if (seen.has(course.courseCode)) continue;
    seen.add(course.courseCode);
    deduped.push(course);
  }
  return deduped;
}

function buildCourseCode(subject: string, number: string): string {
  return `${subject}${number}`.trim().toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = extractSessionId(request.nextUrl.pathname);
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const session = await getV3Session({ userId: user.id, sessionId });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const supabase = await createSupabaseServerComponentClient();

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('university_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const universityId = profileRow?.university_id as number | null | undefined;

    let programQuery = supabase
      .from('program')
      .select('id,name,program_type,is_general_ed,requirements,minimum_credits,target_total_credits')
      .eq('is_general_ed', false)
      .order('name')
      .limit(300);

    if (universityId) {
      programQuery = programQuery.eq('university_id', universityId);
    }

    const { data: programRowsRaw, error: programError } = await programQuery;

    if (programError) {
      throw new Error(programError.message);
    }

    const programRows = (programRowsRaw ?? []) as PipelineProgramRow[];
    const programs = normalizeProgramsForV3(programRows);
    const requirements = buildProgramRequirements(programs, programRows);

    const transcriptCoursesRaw = await fetchUserCoursesArray(supabase, user.id);
    const transcriptNormalization = normalizeTranscriptCourses(
      transcriptCoursesRaw.map((course) => ({
        code: buildCourseCode(course.subject, course.number),
        title: course.title,
        credits: course.credits ?? 0,
        term: course.term,
        grade: course.grade ?? '',
        status: course.status ?? 'Completed',
        source: course.origin ?? 'Institutional',
        fulfills: Array.isArray(course.fulfillsRequirements)
          ? course.fulfillsRequirements
            .map((entry) => entry.requirementId)
            .filter((value): value is string => typeof value === 'string')
          : [],
      }))
    );

    const completedSet = new Set(transcriptNormalization.completedCourseCodes.map((code) => code.toUpperCase()));

    const requiredCourseOptions = dedupeCourses(
      requirements
        .flatMap((entry) => entry.requirements)
        .flatMap((entry) => entry.selectedCourses)
        .filter((course) => !completedSet.has(course.courseCode.toUpperCase()))
    );

    const electiveCourseOptions = dedupeCourses(
      requirements
        .flatMap((program) =>
          program.requirements.flatMap((requirement) => {
            const isElective = /elective/i.test(`${requirement.requirementId} ${requirement.requirementLabel}`);
            if (!isElective) return [];
            return requirement.selectedCourses.map((course) => ({
              ...course,
              source: 'elective' as const,
              requirementBucketKey: null,
            }));
          })
        )
        .filter((course) => !completedSet.has(course.courseCode.toUpperCase()))
    );

    return NextResponse.json({
      success: true,
      stepData: {
        sessionId,
        schemaVersion: session.snapshot.schemaVersion,
        programs,
        programRows,
        requiredCourseOptions: requiredCourseOptions.slice(0, 300),
        electiveCourseOptions: electiveCourseOptions.slice(0, 200),
        transcriptCourses: transcriptNormalization.transcriptCourses,
        completedCourseCodes: transcriptNormalization.completedCourseCodes,
      },
    });
  } catch (error) {
    console.error('Error reading v3 step data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load step data',
      },
      { status: 500 }
    );
  }
}
