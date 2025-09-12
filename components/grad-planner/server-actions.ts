import { supabase } from "@/lib/supabase";

export default async function GetProgramsForUniversity(university_id: number) {
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', false);

    if (error) {
      console.error('❌ Error fetching programs:', error);
      return [];
    }

    return data;
}

export async function GetGenEdsForUniversity(university_id: number) {
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', true);

    if (error) {
      console.error('❌ Error fetching general education programs:', error);
      return [];
    }

    return data;
}

export async function GetStudentProfile(user_id: string) {
  // First, let's try the student table
  const { data: studentData, error: studentError } = await supabase
    .from('student')
    .select('*')
    .eq('profile_id', user_id)
    .single();

  if (!studentError && studentData) {
    return studentData;
  }
  
  // If not found in student table, try profiles table
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, university_id')
    .eq('id', user_id)
    .single();

  if (profileError) {
    console.error('❌ Error fetching from both tables:', { studentError, profileError });
    return null;
  }
  // Map the id to profile_id for consistency
  return {
    profile_id: profileData.id,
    university_id: profileData.university_id
  };
}

export async function GetActiveGradPlan(student_id: number) {
  const { data, error } = await supabase
    .from('grad_plan')
    .select('*')
    .eq('student_id', student_id)
    .single();

  if (error) {
    console.error('❌ Error fetching active grad plan:', error);
    return null;
  }
  return data;
}
