import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { expandFutureTerms } from '@/lib/terms';
import { generateMockForecast } from '@/lib/forecastMock';

export interface ForecastRow {
  course_id: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  demand_count: number;
  detail?: {
    time_of_day: { morning: number; afternoon: number; evening: number };
    modality: { in_person: number; online: number; hybrid: number };
    professors: string[];
  };
}

export interface ForecastResponse {
  term_codes: string[];
  semesters_ahead: 1 | 2 | 3 | 4;
  rows: ForecastRow[];
  is_mock: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check admin status and institution
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, university_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role_id !== 1) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const institutionId = profile.university_id;
    if (!institutionId) {
      return NextResponse.json({ error: 'No institution assigned' }, { status: 400 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const semestersAheadStr = searchParams.get('semesters_ahead') || '1';
    const semestersAhead = Math.min(4, Math.max(1, parseInt(semestersAheadStr, 10))) as 1 | 2 | 3 | 4;
    const subjectFilter = searchParams.get('subject') || '';
    const minDemand = parseInt(searchParams.get('min') || '0', 10);
    const searchQuery = searchParams.get('q') || '';

    // Get future term codes
    const termCodes = expandFutureTerms(semestersAhead);

    // Try to fetch real data from demand_aggregate view
    type DemandAggregateRow = {
      course_id: string;
      subject: string;
      number: string;
      title: string;
      credits: number;
      demand_count: number;
    };

    const { data: realData, error: demandAggregateError } = await supabase
      .from('demand_aggregate')
      .select('*')
      .eq('institution_id', institutionId)
      .in('term_code', termCodes);

    let rows: ForecastRow[] = [];
    let isMock = false;

    if (demandAggregateError) {
      console.error('Error loading demand_aggregate data:', demandAggregateError);
    }

    if (!realData || realData.length === 0) {
      // No real data - generate mock
      isMock = true;

      // Fetch active courses from catalog
      const { data: courses } = await supabase
        .from('program')
        .select('id, name, program_type')
        .eq('university_id', institutionId)
        .limit(100);

      if (!courses || courses.length === 0) {
        // Fallback: create sample courses
        const sampleCourses = [
          { id: '1', subject: 'CS', number: '101', title: 'Intro to Computer Science', credits: 3 },
          { id: '2', subject: 'CS', number: '201', title: 'Data Structures', credits: 3 },
          { id: '3', subject: 'CS', number: '301', title: 'Algorithms', credits: 3 },
          { id: '4', subject: 'MATH', number: '110', title: 'Calculus I', credits: 4 },
          { id: '5', subject: 'MATH', number: '220', title: 'Linear Algebra', credits: 3 },
          { id: '6', subject: 'ENGL', number: '101', title: 'Composition', credits: 3 },
          { id: '7', subject: 'HIST', number: '201', title: 'World History', credits: 3 },
          { id: '8', subject: 'BIO', number: '101', title: 'Biology I', credits: 4 },
        ];

        const mockData = generateMockForecast({
          institutionId,
          termCodes,
          courses: sampleCourses,
          includeDetail: semestersAhead === 1,
        });

        rows = mockData;
      } else {
        // Use programs as course proxies for PoC
        const coursesForMock = courses.slice(0, 50).map((p, i) => ({
          id: p.id,
          subject: p.program_type === 'major' ? 'MAJOR' : 'MINOR',
          number: String(100 + i),
          title: p.name,
          credits: 3,
        }));

        const mockData = generateMockForecast({
          institutionId,
          termCodes,
          courses: coursesForMock,
          includeDetail: semestersAhead === 1,
        });

        rows = mockData;
      }
    } else {
      // Use real data (future implementation when plan_courses exists)
      const typedRealData = (realData ?? []) as DemandAggregateRow[];
      rows = typedRealData.map((row): ForecastRow => ({
        course_id: row.course_id,
        subject: row.subject,
        number: row.number,
        title: row.title,
        credits: row.credits,
        demand_count: row.demand_count,
      }));
    }

    // Apply filters
    if (subjectFilter) {
      rows = rows.filter(r => r.subject.toLowerCase().startsWith(subjectFilter.toLowerCase()));
    }
    if (minDemand > 0) {
      rows = rows.filter(r => r.demand_count >= minDemand);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r =>
        r.subject.toLowerCase().includes(q) ||
        r.number.includes(q) ||
        r.title.toLowerCase().includes(q)
      );
    }

    // Sort by demand descending
    rows.sort((a, b) => b.demand_count - a.demand_count);

    // Limit to top 100
    rows = rows.slice(0, 100);

    const response: ForecastResponse = {
      term_codes: termCodes,
      semesters_ahead: semestersAhead,
      rows,
      is_mock: isMock,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/admin/forecast:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
