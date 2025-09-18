import type { ProgramRow } from '@/types/program';
import { supabase } from '../supabase';
import { OrganizeCoursesIntoSemesters_ServerAction } from './server-actions';

// Regular database functions that don't need server-only features
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

export async function createProgram(programData: Omit<ProgramRow, 'id' | 'created_at' | 'modified_at'>): Promise<ProgramRow> {
    const createData = {
        ...programData,
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('program')
        .insert(createData)
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

export async function createGraduationPlan(planData?: unknown): Promise<{ success: boolean; message: string; planId?: string }> {
    // TODO: Implement graduation plan creation logic
    // This is a stub function that will be implemented later
    
    try {
        // Log the planData for debugging
        if (planData) {
            console.log('📋 Creating graduation plan with data:', planData);
        }
        
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

export async function submitGradPlanForApproval(
    studentId: number,
    gradPlanData: unknown
): Promise<{ success: boolean; message: string }> {
    
    try {
        // TODO: Implement actual submission logic
        // For now, simulate the submission process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            success: true,
            message: 'Graduation plan submitted for approval successfully!'
        };
    } catch (error) {
        console.error('Error submitting graduation plan:', error);
        return {
            success: false,
            message: 'Failed to submit graduation plan. Please try again.'
        };
    }
}

export async function GetGenEdsForUniversity(university_id: number) {
    
    try {
        const { data, error } = await supabase
            .from('general_education')
            .select('*')
            .eq('university_id', university_id);
        
        if (error) {
            console.error('❌ Error fetching general education data:', error);
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error in GetGenEdsForUniversity:', error);
        throw error;
    }
}

export async function GetStudentProfile(user_id: string) {
    
    try {
        const { data, error } = await supabase
            .from('student_profile')
            .select('*')
            .eq('user_id', user_id)
            .single();
        
        if (error) {
            console.error('❌ Error fetching student profile:', error);
            // Don't throw here, let the calling code handle missing profiles
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error in GetStudentProfile:', error);
        return null;
    }
}

export async function GetActiveGradPlan(profile_id: string) {
  
  try {
    const { data, error } = await supabase
      .from('graduation_plan')
      .select('*')
      .eq('student_profile_id', profile_id)
      .eq('status', 'active') // Only get active plans
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching active graduation plan:', error);
      throw error;
    }
    
    // Return the first (most recent) active plan, or null if none found
    const activePlan = data && data.length > 0 ? data[0] : null;
    console.log('✅ Active graduation plan result:', activePlan ? 'Found plan' : 'No active plan');
    
    return activePlan;
  } catch (error) {
    console.error('❌ Error in GetActiveGradPlan:', error);
    throw error;
  }
}

// Client-safe wrapper for the AI course organization functionality
// This calls the secure server action that handles OpenAI API and user authentication
export async function OrganizeCoursesIntoSemesters(coursesData: unknown): Promise<{ success: boolean; message: string; semesterPlan?: unknown }> {
  console.log('🔍 Client wrapper: OrganizeCoursesIntoSemesters called with:', coursesData);
  
  try {
    // Call the secure server action that handles authentication and OpenAI API
    const result = await OrganizeCoursesIntoSemesters_ServerAction(coursesData);
    console.log('✅ Server action result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in client wrapper OrganizeCoursesIntoSemesters:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate semester plan'
    };
  }
}
