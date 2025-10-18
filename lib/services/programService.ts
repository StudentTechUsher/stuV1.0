import { ProgramRow } from "@/types/program";
import { db } from "@/lib/database";

// Custom error types for better error handling
export class ProgramNotFoundError extends Error {
  constructor(message = 'Program not found') {
    super(message);
    this.name = 'ProgramNotFoundError';
  }
}

export class ProgramFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProgramFetchError';
  }
}

/**
 * AUTHORIZED FOR ANONYMOUS USERS AND ABOVE
 * Fetches all programs for a given university
 * @param universityId 
 * @returns 
 */
export async function fetchProgramsByUniversity(universityId: number): Promise<ProgramRow[]> {
    const { data, error } = await db
    .from('program')
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ProgramRow[];
}

export default async function GetProgramsForUniversity(university_id: number): Promise<ProgramRow[]> {

    const { data, error } = await db
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', false);

    if (error) {
      console.error('❌ Error fetching programs:', error);
      return [];
    }

    return (data || []) as ProgramRow[];
}

export async function GetMajorsForUniversity(university_id: number): Promise<ProgramRow[]> {
  const { data, error } = await db
    .from('program')
    .select('*')
    .eq('university_id', university_id)
    .eq('program_type', 'major')
    .eq('is_general_ed', false);

  if (error) {
    console.error('❌ Error fetching majors:', error);
    return [];
  }

  return (data || []) as ProgramRow[];
}

export async function GetGenEdsForUniversity(university_id: number): Promise<ProgramRow[]> {
    const { data, error } = await db
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', true);

    if (error) {
      console.error('❌ Error fetching general education programs:', error);
      return [];
    }

    return (data || []) as ProgramRow[];
}

/**
 * AUTHORIZED FOR ADMINS ONLY
 * Deletes a program by its ID
 */
export async function deleteProgram(id: string): Promise<void> {
    const { error } = await db
        .from('program')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * AUTHORIZED FOR ADMINS ONLY
 * Update ONLY the requirements blob for a program (does not touch other metadata)
 */
export async function updateProgramRequirements(id: string, requirements: unknown): Promise<ProgramRow> {
  const { data, error } = await db
    .from('program')
    .update({ requirements })
    .eq('id', id)
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .single();

  if (error) throw error;
  return data as ProgramRow;
}

/**
 * AUTHORIZED FOR ADMINS ONLY
 * Generic program update – automatically bumps modified_at timestamp
 */
export async function updateProgram(id: string, updates: Partial<Omit<ProgramRow, 'id' | 'created_at'>>): Promise<ProgramRow> {
  const updateData = {
    ...updates,
    modified_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from('program')
    .update(updateData)
    .eq('id', id)
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .single();

  if (error) throw error;
  return data as ProgramRow;
}

/**
 * AUTHORIZED FOR ADMINS ONLY
 * Create a new program row – sets created_at & modified_at
 */
export async function createProgram(programData: Omit<ProgramRow, 'id' | 'created_at' | 'modified_at'>): Promise<ProgramRow> {
  const createData = {
    ...programData,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from('program')
    .insert(createData)
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .single();

  if (error) throw error;
  return data as ProgramRow;
}

export async function GetMinorsForUniversity(university_id: number): Promise<ProgramRow[]> {
  const { data, error } = await db
    .from('program')
    .select('*')
    .eq('university_id', university_id)
    .eq('program_type', 'minor')
    .eq('is_general_ed', false);

  if (error) {
    console.error('❌ Error fetching minors:', error);
    return [];
  }
  return (data || []) as ProgramRow[];
}

/**
 * AUTHORIZATION: PUBLIC
 * Fetches programs with optional filters for type and university
 * @param options - Filter options (type, universityId)
 * @returns Array of matching programs
 */
export async function fetchPrograms(options?: { type?: string; universityId?: number }) {
  try {
    let query = db
      .from('program')
      .select('id,name,university_id,program_type')
      .order('name');

    if (options?.type) {
      query = query.eq('program_type', options.type);
    }

    if (options?.universityId) {
      query = query.eq('university_id', options.universityId);
    }

    const { data, error } = await query;

    if (error) {
      throw new ProgramFetchError('Failed to fetch programs', error);
    }

    return data ?? [];
  } catch (error) {
    if (error instanceof ProgramFetchError) {
      throw error;
    }
    throw new ProgramFetchError('Unexpected error fetching programs', error);
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Fetches multiple programs by their IDs
 * @param ids - Array of program IDs
 * @param universityId - Optional university filter
 * @returns Array of matching programs
 */
export async function fetchProgramsBatch(ids: string[], universityId?: number): Promise<ProgramRow[]> {
  try {
    if (ids.length === 0) {
      return [];
    }

    let query = db
      .from('program')
      .select('id, name, university_id, program_type, version, created_at, modified_at, requirements, is_general_ed')
      .in('id', ids)
      .order('name');

    if (universityId) {
      query = query.eq('university_id', universityId);
    }

    const { data, error } = await query;

    if (error) {
      throw new ProgramFetchError('Failed to fetch programs batch', error);
    }

    return (data ?? []) as ProgramRow[];
  } catch (error) {
    if (error instanceof ProgramFetchError) {
      throw error;
    }
    throw new ProgramFetchError('Unexpected error fetching programs batch', error);
  }
}