import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

type GradPlanCourse = { code?: string; course_code?: string; title?: string; credits?: number };

type GradPlanTerm = {
  term?: string;
  title?: string;
  courses?: GradPlanCourse[];
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

const getCourseCode = (course: GradPlanCourse) => course.code || course.course_code || '';

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

const findNextTermIndex = (plan: GradPlanTerm[], startIndex: number) => {
  for (let i = startIndex + 1; i < plan.length; i += 1) {
    if (isTermItem(plan[i])) return i;
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

    const targetIndex = findNextTermIndex(plan, sourceIndex);
    if (targetIndex === -1) {
      return NextResponse.json({ error: 'No next term available' }, { status: 404 });
    }

    const sourceTerm = plan[sourceIndex];
    const targetTerm = plan[targetIndex];

    if (!Array.isArray(sourceTerm.courses)) {
      sourceTerm.courses = [];
    }
    if (!Array.isArray(targetTerm.courses)) {
      targetTerm.courses = [];
    }

    const existingCourse = sourceTerm.courses.find(c => getCourseCode(c) === courseCode);
    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found in term' }, { status: 404 });
    }

    const targetHasCourse = targetTerm.courses.some(c => getCourseCode(c) === courseCode);
    if (targetHasCourse) {
      return NextResponse.json({ error: 'Course already exists in next term' }, { status: 409 });
    }

    sourceTerm.courses = sourceTerm.courses.filter(c => getCourseCode(c) !== courseCode);
    targetTerm.courses.push({
      code: existingCourse.code || existingCourse.course_code || courseCode,
      title: existingCourse.title || courseCode,
      credits: existingCourse.credits || 3,
    });

    sourceTerm.credits_planned = calculateCredits(sourceTerm.courses);
    targetTerm.credits_planned = calculateCredits(targetTerm.courses);

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
      message: 'Course moved to next term',
      movedToTerm: targetTerm.term || targetTerm.title,
      newCredits: targetTerm.credits_planned ?? 0,
    });
  } catch (error) {
    console.error('Error moving course to next term:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
