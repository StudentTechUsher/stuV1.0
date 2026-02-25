import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

type GradPlanTerm = {
  term?: string;
  title?: string;
  courses?: Array<{ code?: string; course_code?: string; title?: string; credits?: number }>;
  credits_planned?: number;
  [key: string]: unknown;
};

type GradPlanDetails = {
  plan?: GradPlanTerm[];
  [key: string]: unknown;
};

const isTermItem = (item: unknown): item is GradPlanTerm => {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  const hasTerm = typeof candidate.term === 'string' || typeof candidate.title === 'string';
  const isEvent = 'type' in candidate && 'afterTerm' in candidate;
  return hasTerm && !isEvent;
};

const getCourseCode = (course: { code?: string; course_code?: string }) =>
  course.code || course.course_code || '';

const findTermIndex = (plan: GradPlanTerm[], termIndex?: number, termName?: string | null) => {
  if (termName) {
    const byName = plan.findIndex(
      (item) => isTermItem(item) && (item.term === termName || item.title === termName)
    );
    if (byName !== -1) return byName;
  }
  if (termIndex !== undefined && termIndex !== null && plan[termIndex] && isTermItem(plan[termIndex])) {
    return termIndex;
  }
  return -1;
};

const calculateCredits = (courses: Array<{ credits?: number }>) =>
  courses.reduce((sum, c) => sum + (c.credits || 0), 0);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gradPlanId, termIndex, termName, courseCode } = body as {
      gradPlanId?: string;
      termIndex?: number;
      termName?: string | null;
      courseCode?: string;
    };

    if (!gradPlanId || courseCode === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: gradPlanId, courseCode' },
        { status: 400 }
      );
    }

    const { data: student, error: studentError } = await supabase
      .from('student')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Failed to fetch student record:', studentError);
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const { data: gradPlan, error: fetchError } = await supabase
      .from('grad_plan')
      .select('plan_details, student_id')
      .eq('id', gradPlanId)
      .single();

    if (fetchError || !gradPlan) {
      console.error('Failed to fetch grad plan:', fetchError);
      return NextResponse.json({ error: 'Grad plan not found' }, { status: 404 });
    }

    if (gradPlan.student_id !== student.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let planDetails: GradPlanDetails;
    try {
      planDetails = typeof gradPlan.plan_details === 'string'
        ? JSON.parse(gradPlan.plan_details)
        : (gradPlan.plan_details as GradPlanDetails);
    } catch (error) {
      console.error('Failed to parse plan_details:', error);
      return NextResponse.json({ error: 'Invalid plan details format' }, { status: 500 });
    }

    if (!planDetails || !Array.isArray(planDetails.plan)) {
      return NextResponse.json({ error: 'Invalid plan structure' }, { status: 500 });
    }

    const plan = planDetails.plan;
    const sourceIndex = findTermIndex(plan, termIndex, termName);
    if (sourceIndex === -1) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    const sourceTerm = plan[sourceIndex];
    if (!Array.isArray(sourceTerm.courses)) {
      sourceTerm.courses = [];
    }

    const existingCourses = sourceTerm.courses;
    const updatedCourses = existingCourses.filter(c => getCourseCode(c) !== courseCode);

    if (updatedCourses.length === existingCourses.length) {
      return NextResponse.json({ error: 'Course not found in term' }, { status: 404 });
    }

    sourceTerm.courses = updatedCourses;
    sourceTerm.credits_planned = calculateCredits(updatedCourses);

    const { error: updateError } = await supabase
      .from('grad_plan')
      .update({ plan_details: planDetails })
      .eq('id', gradPlanId);

    if (updateError) {
      console.error('Failed to update grad plan:', updateError);
      return NextResponse.json({ error: 'Failed to update grad plan' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Course removed from graduation plan',
      newCredits: sourceTerm.credits_planned ?? 0,
    });
  } catch (error) {
    console.error('Error removing course from grad plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
