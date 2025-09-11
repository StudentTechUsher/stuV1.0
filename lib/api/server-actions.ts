import { supabase } from '@/lib/supabaseClient';
import type { ProgramRow } from '@/types/program';


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