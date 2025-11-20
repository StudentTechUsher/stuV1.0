'use server';

import { SandboxPlanner } from '@/components/sandbox-planner/SandboxPlanner';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Course, StudentProfile } from '@/components/sandbox-planner/types';

/**
 * Sandbox Mode Page
 * Free-form graduation planning canvas
 * AUTHORIZATION: STUDENTS
 */
export default async function SandboxPage() {
  // Get authenticated user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op in Server Components
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return <div>Error: User not authenticated</div>;
  }

  // Get student profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, fname, lname')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
  }

  // Use profile if available, otherwise create defaults
  const userId = profile?.id || user.id;
  const fname = profile?.fname || 'Student';
  const lname = profile?.lname || '';

  // For now, skip fetching student programs (can add later)
  const selectedPrograms: string[] = [];

  // TODO: Fetch remaining courses from service
  // For now, use sample data for testing
  const remainingCourses: Course[] = [
    {
      id: '1',
      code: 'CHEM 101',
      title: 'General Chemistry I',
      credits: 4,
      requirement: 'Major',
      prerequisite: 'None',
      description: 'Introduction to chemical principles and reactions',
      offeringTerms: ['Fall', 'Spring'],
      fulfills: ['Core Requirements'],
    },
    {
      id: '2',
      code: 'PHYS 201',
      title: 'Physics II',
      credits: 4,
      requirement: 'Major',
      prerequisite: 'PHYS 101',
      description: 'Electricity, magnetism, and waves',
      offeringTerms: ['Spring'],
      fulfills: ['Core Requirements'],
    },
    {
      id: '3',
      code: 'MATH 301',
      title: 'Calculus III',
      credits: 4,
      requirement: 'Major',
      prerequisite: 'MATH 201',
      description: 'Multivariable calculus',
      offeringTerms: ['Fall', 'Spring'],
      fulfills: ['Core Requirements'],
    },
    {
      id: '4',
      code: 'BIOL 101',
      title: 'Biology I',
      credits: 3,
      requirement: 'Gen Ed',
      prerequisite: 'None',
      description: 'General biology concepts',
      offeringTerms: ['Fall', 'Spring', 'Summer'],
      fulfills: ['Science Requirement'],
    },
    {
      id: '5',
      code: 'HIST 200',
      title: 'World History',
      credits: 3,
      requirement: 'Gen Ed',
      prerequisite: 'None',
      description: 'Survey of world history',
      offeringTerms: ['Fall', 'Spring'],
      fulfills: ['Humanities'],
    },
    {
      id: '6',
      code: 'ENG 150',
      title: 'Academic Writing',
      credits: 3,
      requirement: 'Gen Ed',
      prerequisite: 'None',
      description: 'Advanced writing skills',
      offeringTerms: ['Fall', 'Spring', 'Summer'],
      fulfills: ['Communication'],
    },
    {
      id: '7',
      code: 'ECON 100',
      title: 'Introduction to Economics',
      credits: 3,
      requirement: 'Elective',
      prerequisite: 'None',
      description: 'Basic economic principles',
      offeringTerms: ['Fall', 'Spring'],
      fulfills: [],
    },
    {
      id: '8',
      code: 'PSYCH 101',
      title: 'Intro to Psychology',
      credits: 3,
      requirement: 'Elective',
      prerequisite: 'None',
      description: 'Fundamentals of psychology',
      offeringTerms: ['Fall', 'Spring'],
      fulfills: [],
    },
  ];

  const studentProfile: StudentProfile = {
    id: userId,
    fname: fname,
    lname: lname,
    selectedPrograms,
  };

  /**
   * Handle saving plan to backend
   */
  async function handleSavePlan(semesters: any[]) {
    'use server';

    try {
      // Transform semester lanes to grad plan format
      const planData = {
        plan: semesters.map((sem) => ({
          term: sem.term,
          courses: sem.courses.map((course: Course) => ({
            code: course.code,
            title: course.title,
            credits: course.credits,
            fulfills: course.fulfills || [],
          })),
          notes: sem.notes || '',
        })),
      };

      // TODO: Save using gradPlanService
      // For now, just log
      console.log('Would save plan:', planData);

      // Example: await saveGradPlan(user.id, planData);
    } catch (error) {
      console.error('Failed to save plan:', error);
      throw error;
    }
  }

  return (
    <div className="h-screen w-full">
      <SandboxPlanner
        studentId={user.id}
        remainingCourses={remainingCourses}
        studentProfile={studentProfile}
        onSavePlan={handleSavePlan}
      />
    </div>
  );
}
