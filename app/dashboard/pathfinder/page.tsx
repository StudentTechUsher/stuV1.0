import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import PathfinderClient from '@/components/pathfinder/pathfinder-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function PathfinderPage() {
  // Get authenticated user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* no-op in Server Components */ },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // Fetch user's profile to get their current major
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  // Fetch student data to get student id
  const { data: studentData } = await supabase
    .from('student')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  // Fetch active grad plan and programs
  let currentPrograms: Array<{ id: number; name: string }> = [];

  if (studentData?.id) {
    // Fetch active grad plan
    const { data: gradPlan } = await supabase
      .from('grad_plan')
      .select('programs_in_plan')
      .eq('student_id', studentData.id)
      .eq('is_active', true)
      .maybeSingle();

    // Extract program IDs from grad plan
    if (gradPlan?.programs_in_plan && Array.isArray(gradPlan.programs_in_plan)) {
      const programIds = gradPlan.programs_in_plan.filter((id) => typeof id === 'number');

      if (programIds.length > 0) {
        // Fetch program data for all program IDs
        const { data: programs } = await supabase
          .from('program')
          .select('id, name')
          .in('id', programIds);

        if (programs && programs.length > 0) {
          currentPrograms = programs;
        }
      }
    }
  }

  // Fetch user's courses directly from database
  let courses: Array<{ id: string; code: string; title: string; credits: number; term: string; grade: string; tags: string[] }> = [];

  try {
    // Fetch all user courses
    const { data: userCoursesRecords, error: coursesError } = await supabase
      .from('user_courses')
      .select('courses')
      .eq('user_id', user.id)
      .order('inserted_at', { ascending: false })
      .limit(1);

    if (coursesError) {
      console.error('Error fetching user courses:', coursesError);
    } else if (userCoursesRecords && userCoursesRecords.length > 0) {
      const coursesData = userCoursesRecords[0].courses;

      // The courses field is a JSONB array of course objects
      if (Array.isArray(coursesData)) {
        // Format courses for display with automatic tagging
        courses = coursesData.map((course: Record<string, unknown>, index: number) => {
          const tags: string[] = [];
          const subject = (course.subject as string)?.toUpperCase() || '';

          // Infer tags based on subject
          if (['CS', 'IS', 'IT', 'CIS'].includes(subject)) {
            tags.push('Computer Science');
          } else if (['MATH', 'STAT', 'CALC'].includes(subject)) {
            tags.push('Math');
          } else if (['ENG', 'ENGL', 'WRIT'].includes(subject)) {
            tags.push('English');
          } else if (['PHYS', 'CHEM', 'BIO', 'SCI'].includes(subject)) {
            tags.push('Science');
          } else if (['HIST', 'PHIL', 'LIT'].includes(subject)) {
            tags.push('Humanities');
          } else if (['ACC', 'BUS', 'ECON', 'FIN', 'MGT'].includes(subject)) {
            tags.push('Business');
          }

          // Add tags based on course level
          const courseNum = parseInt((course.number as string) || '0');
          if (!isNaN(courseNum)) {
            if (courseNum < 200) {
              tags.push('Introductory');
            } else if (courseNum >= 300) {
              tags.push('Advanced');
            }
          }

          // Add grade-based tag
          if (course.grade) {
            const gradeUpper = (course.grade as string).toUpperCase();
            if (['A', 'A-', 'A+'].includes(gradeUpper)) {
              tags.push('High Grade');
            }
          }

          return {
            id: (course.id as string) || `course-${index}`,
            code: `${course.subject || ''} ${course.number || ''}`.trim(),
            title: (course.title as string) || 'Untitled Course',
            credits: Number(course.credits) || 0,
            term: (course.term as string) || 'Unknown',
            grade: (course.grade as string) || 'In Progress',
            tags: tags.length > 0 ? tags : ['General'],
          };
        });
      }
    }
  } catch (error) {
    console.error('Error fetching user courses:', error);
    // Continue with empty courses array - the UI will handle this gracefully
  }

  return (
    <PathfinderClient
      courses={courses}
      currentPrograms={currentPrograms}
    />
  );
}