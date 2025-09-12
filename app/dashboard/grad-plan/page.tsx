import Box from '@mui/material/Box';
import { createServerSupabase } from '@/lib/supabaseServer';
import { GetStudentProfile, GetActiveGradPlan } from '@/components/grad-planner/server-actions';
import FourYearPlanner from "@/components/grad-planner/grad-planner";
import { GraduationPlan } from "@/types/graduation-plan";

const RAIL_WIDTH = 80;

export default async function GradPlanPage() {
  
  // STEP 1: Get the current user from Supabase session
  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) {
    return (
      <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
        <div>Please log in to view your graduation plan.</div>
      </Box>
    );
  }

  // STEP 2: Get student record from the database using user UUID
  const studentRecord = await GetStudentProfile(user.id);
  
  if (!studentRecord) {
    return (
      <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
        <div>
          <h2>Debug Info:</h2>
          <p>User ID: {user.id}</p>
          <p>User Email: {user.email}</p>
          <p>Student record not found in database.</p>
        </div>
      </Box>
    );
  }

  // STEP 3: Get grad plan using student ID
  const gradPlanRecord = await GetActiveGradPlan(studentRecord.id);

  // Parse the plan data from the database record
  let parsedPlan: GraduationPlan | undefined = undefined;
  if (gradPlanRecord?.plan_data) {
    try {
      // If plan_data is a string, parse it; if it's already an object, use it directly
      parsedPlan = typeof gradPlanRecord.plan_data === 'string' 
        ? JSON.parse(gradPlanRecord.plan_data) 
        : gradPlanRecord.plan_data;
    } catch (error) {
      console.error('❌ Error parsing plan data:', error);
      parsedPlan = undefined;
    }
  }

  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
      <FourYearPlanner 
        plan={parsedPlan}
        studentProfile={studentRecord}
      />
    </Box>
  );
}
