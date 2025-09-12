import type { ProgramRow } from '@/types/program';
import { supabase } from '../supabase';


export async function fetchProgramsByUniversity(universityId: number): Promise<ProgramRow[]> {
    const { data, error } = await supabase
    .from('program')
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ProgramRow[];
}


export async function updateProgramRequirements(id: string, requirements: unknown): Promise<ProgramRow> {
    const { data, error } = await supabase
        .from('program')
        .update({ requirements })
        .eq('id', id)
        .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
        .single();

    if (error) throw error;
    return data as ProgramRow;
}

export async function updateProgram(id: string, updates: Partial<Omit<ProgramRow, 'id' | 'created_at'>>): Promise<ProgramRow> {
    // Ensure modified_at is always updated
    const updateData = {
        ...updates,
        modified_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('program')
        .update(updateData)
        .eq('id', id)
        .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
        .single();

    if (error) throw error;
    return data as ProgramRow;
}

export async function deleteProgram(id: string): Promise<void> {
    const { error } = await supabase
        .from('program')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function createGraduationPlan(planData: unknown): Promise<{ success: boolean; message: string; planId?: string }> {
    // TODO: Implement graduation plan creation logic
    // This is a stub function that will be implemented later
    
    console.log('Creating graduation plan with data:', planData);
    
    try {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, just return a success response
        return {
            success: true,
            message: 'Graduation plan created successfully!',
            planId: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        };
    } catch (error) {
        console.error('Error creating graduation plan:', error);
        return {
            success: false,
            message: 'Failed to create graduation plan. Please try again.'
        };
    }
}

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
