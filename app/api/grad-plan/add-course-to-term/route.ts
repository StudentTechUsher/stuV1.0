import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  return handleAddCourseToTerm(request);
}

async function handleAddCourseToTerm(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gradPlanId, termIndex, course } = body;

    if (!gradPlanId || termIndex === undefined || !course) {
      return NextResponse.json(
        { error: 'Missing required fields: gradPlanId, termIndex, course' },
        { status: 400 }
      );
    }

    // Get the student record for this user
    const { data: student, error: studentError } = await supabase
      .from('student')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Failed to fetch student record:', studentError);
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Fetch the grad plan
    const { data: gradPlan, error: fetchError } = await supabase
      .from('grad_plan')
      .select('plan_details, student_id')
      .eq('id', gradPlanId)
      .single();

    if (fetchError || !gradPlan) {
      console.error('Failed to fetch grad plan:', fetchError);
      return NextResponse.json({ error: 'Grad plan not found' }, { status: 404 });
    }

    // Verify user owns this grad plan
    if (gradPlan.student_id !== student.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse plan_details
    let planDetails;
    try {
      planDetails = typeof gradPlan.plan_details === 'string'
        ? JSON.parse(gradPlan.plan_details)
        : gradPlan.plan_details;
    } catch (error) {
      console.error('Failed to parse plan_details:', error);
      return NextResponse.json({ error: 'Invalid plan details format' }, { status: 500 });
    }

    // Ensure plan_details has the expected structure
    if (!planDetails || !Array.isArray(planDetails.plan)) {
      return NextResponse.json({ error: 'Invalid plan structure' }, { status: 500 });
    }

    // Check if term exists
    if (!planDetails.plan[termIndex]) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Initialize courses array if it doesn't exist
    if (!Array.isArray(planDetails.plan[termIndex].courses)) {
      planDetails.plan[termIndex].courses = [];
    }

    // Check if course already exists in this term
    const courseExists = planDetails.plan[termIndex].courses.some(
      (c: { code: string }) => c.code === course.code
    );

    if (courseExists) {
      return NextResponse.json({ error: 'Course already exists in this term' }, { status: 409 });
    }

    // Add the course to the term
    planDetails.plan[termIndex].courses.push({
      code: course.code,
      title: course.title,
      credits: course.credits,
    });

    // Update credits_planned for the term
    const termCredits = planDetails.plan[termIndex].courses.reduce(
      (sum: number, c: { credits: number }) => sum + (c.credits || 0),
      0
    );
    planDetails.plan[termIndex].credits_planned = termCredits;

    // Update the grad plan in the database
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
      message: 'Course added to graduation plan successfully',
      newCredits: termCredits,
    });

  } catch (error) {
    console.error('Error adding course to grad plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
