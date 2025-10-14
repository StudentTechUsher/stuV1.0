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

  // Fetch student data to get current major
  const { data: studentData } = await supabase
    .from('student')
    .select('profile_id, selected_programs')
    .eq('profile_id', user.id)
    .maybeSingle();

  // Determine current major from student data
  let currentMajor = 'Computer Science'; // Default fallback

  if (studentData && Array.isArray(studentData.selected_programs) && studentData.selected_programs.length > 0) {
    // Fetch the first selected program name
    const programId = studentData.selected_programs[0];
    if (typeof programId === 'number') {
      const { data: programData } = await supabase
        .from('program')
        .select('name')
        .eq('id', programId)
        .maybeSingle();

      if (programData?.name) {
        currentMajor = programData.name;
      }
    }
  }

  // Fetch user's courses directly from database
  let courses: Array<{ id: string; code: string; title: string; credits: number; term: string; grade: string; tags: string[] }> = [];

  try {
    // Fetch all user courses
    const { data: userCourses, error: coursesError } = await supabase
      .from('user_courses')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .order('term', { ascending: false });

    if (coursesError) {
      console.error('Error fetching user courses:', coursesError);
    } else if (userCourses && userCourses.length > 0) {
      // Format courses for display with automatic tagging
      courses = userCourses.map((course) => {
        const tags: string[] = [];
        const subject = course.subject?.toUpperCase() || '';

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
        const courseNum = parseInt(course.number || '0');
        if (!isNaN(courseNum)) {
          if (courseNum < 200) {
            tags.push('Introductory');
          } else if (courseNum >= 300) {
            tags.push('Advanced');
          }
        }

        // Add grade-based tag
        if (course.grade) {
          const gradeUpper = course.grade.toUpperCase();
          if (['A', 'A-', 'A+'].includes(gradeUpper)) {
            tags.push('High Grade');
          }
        }

        return {
          id: course.id,
          code: `${course.subject} ${course.number}`,
          title: course.title,
          credits: Number(course.credits),
          term: course.term,
          grade: course.grade || 'In Progress',
          tags: tags.length > 0 ? tags : ['General'],
        };
      });
    }
  } catch (error) {
    console.error('Error fetching user courses:', error);
    // Continue with empty courses array - the UI will handle this gracefully
  }

  // If no courses found, provide some sample data for demonstration
  if (courses.length === 0) {
    courses = [
      { id: '1', code: 'IS 110', title: 'Intro to Programming', credits: 3, term: 'Fall 2023', grade: 'A', tags: ['Major Core'] },
      { id: '2', code: 'ACC 200', title: 'Calculus I', credits: 4, term: 'Fall 2023', grade: 'B+', tags: ['Math', 'GenEd'] },
      { id: '3', code: 'ENG 110', title: 'College Writing', credits: 3, term: 'Fall 2023', grade: 'A-', tags: ['GenEd'] },
      { id: '4', code: 'CS 142', title: 'Data Structures & Algorithms', credits: 3, term: 'Winter 2024', grade: 'A', tags: ['Major Core'] },
      { id: '5', code: 'STAT 221', title: 'Intro to Statistics', credits: 3, term: 'Winter 2024', grade: 'A-', tags: ['Major Elective'] },
      { id: '6', code: 'HIST 201', title: 'World Civilizations', credits: 3, term: 'Winter 2024', grade: 'B', tags: ['GenEd', 'Humanities'] },
      { id: '7', code: 'CS 260', title: 'Computer Architecture', credits: 3, term: 'Fall 2024', grade: 'In Progress', tags: ['Major Core'] },
      { id: '8', code: 'PHYS 121', title: 'Physics I', credits: 4, term: 'Fall 2024', grade: 'In Progress', tags: ['Science'] },
      { id: '9', code: 'ART 101', title: 'Foundations of Art', credits: 2, term: 'Fall 2024', grade: 'In Progress', tags: ['Arts', 'GenEd'] },
    ];
  }

  return (
    <PathfinderClient
      courses={courses}
      currentMajor={currentMajor}
    />
  );
}