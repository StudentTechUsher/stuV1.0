import "server-only";
import { createClient } from "@supabase/supabase-js";

export type Option = { id: number; name: string; university_id?: number | null };

function sClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function listUniversities(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("university").select("id,name").order("name");
  if (error) throw new Error(`[university] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listMajors(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("program")
    .select("id,name,university_id")
    .eq("program_type", "major")
    .order("name");
  if (error) throw new Error(`[program/major] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listMinors(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("program")
    .select("id,name,university_id")
    .eq("program_type", "minor")
    .order("name");
  if (error) throw new Error(`[program/minor] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listStudentInterests(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("student_interests").select("id,name").order("name");
  if (error) throw new Error(`[student_interests] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listCareerOptions(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("career_options").select("id,name").order("name");
  if (error) throw new Error(`[career_options] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listClassPreferences(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("class_preferences").select("id,name").order("name");
  if (error) throw new Error(`[class_preferences] ${error.message}`);
  return (data ?? []) as Option[];
}

// New function to get current user's profile data
export async function getCurrentUserProfile(userId: string) {
  const supabase = sClient();
  
  // Get profile data
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      fname,
      lname,
      university_id,
      university:university_id(id, name)
    `)
    .eq("id", userId)
    .single();

  if (profileError) {
    // If no profile exists yet, return null
    if (profileError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`[profile] ${profileError.message}`);
  }

  // Get student data
  const { data: studentData, error: studentError } = await supabase
    .from("student")
    .select(`
      selected_interests,
      career_options,
      selected_programs,
      class_preferences
    `)
    .eq("profile_id", userId)
    .single();

  // If student data doesn't exist, use null values
  const studentInfo = studentError ? {
    selected_interests: null,
    career_options: null,
    selected_programs: null,
    class_preferences: null,
  } : studentData;

  // If we have selected programs, we need to look up their types to separate majors from minors
  let selectedMajors = null;
  let selectedMinors = null;

  if (studentInfo.selected_programs && studentInfo.selected_programs.length > 0) {
    const { data: programsData } = await supabase
      .from("program")
      .select("id, program_type")
      .in("id", studentInfo.selected_programs);

    if (programsData) {
      selectedMajors = programsData
        .filter(p => p.program_type === 'major')
        .map(p => p.id);
      selectedMinors = programsData
        .filter(p => p.program_type === 'minor')
        .map(p => p.id);
    }
  }
  
  // Transform the data to match the expected format
  return {
    id: profileData.id,
    fname: profileData.fname,
    lname: profileData.lname,
    university_id: profileData.university_id,
    university: profileData.university,
    selected_majors: selectedMajors,
    selected_minors: selectedMinors,
    selected_interests: studentInfo.selected_interests,
    career_options: studentInfo.career_options,
    class_preferences: studentInfo.class_preferences,
  };
}
