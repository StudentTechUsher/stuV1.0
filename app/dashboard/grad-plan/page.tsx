import { createServerSupabase } from '@/lib/supabaseServer';
import GradPlanClient from "@/components/grad-planner/grad-plan-client";
import GetProgramsForUniversity, { GetStudentProfile, GetActiveGradPlan, GetGenEdsForUniversity } from '@/lib/api/server-actions';

export default async function GradPlanPage() {
  
  // STEP 1: Get the current user from Supabase session
  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  // STEP 2: Get student record from the database using user UUID
  const studentRecord = user ? await GetStudentProfile(user.id) : null;
  const gradPlanRecord = studentRecord ? await GetActiveGradPlan(studentRecord.id) : null;

  // STEP 3: Get programs data and general education data for user's university
  const programsData = studentRecord ? await GetProgramsForUniversity(studentRecord.university_id) : [];
  const genEdData = studentRecord ? await GetGenEdsForUniversity(studentRecord.university_id) : [];

  return (
    <GradPlanClient 
      user={user}
      studentRecord={studentRecord}
      gradPlanRecord={gradPlanRecord}
      programsData={programsData}
      genEdData={genEdData}
    />
  );
}
