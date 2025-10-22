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

export class CourseFlowSaveError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseFlowSaveError';
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
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements, is_general_ed')
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

// Types for course flow data
export interface CourseFlowData {
  courses: Array<{
    id: string;
    courseCode: string;
    courseTitle: string;
    position: { x: number; y: number };
    isRequired: boolean;
    requirementDesc?: string;
  }>;
  connections: Array<{
    id: string;
    fromCourseId: string;
    toCourseId: string | null;
    toNodeId: string | null;
    fromSide: 'top' | 'right' | 'bottom' | 'left';
    toSide: 'top' | 'right' | 'bottom' | 'left';
    relationshipType?: 'prerequisite' | 'corequisite' | 'optional_prereq' | 'concurrent' | 'either_or';
  }>;
  connectionNodes: Array<{
    id: string;
    x: number;
    y: number;
    requiredCount: number;
  }>;
}

/**
 * AUTHORIZED FOR ADVISORS ONLY
 * Saves course flow data with a minor version increment (e.g., 1.0 -> 1.1)
 * @param programId - ID of the program to update
 * @param flowData - Course flow data to save
 * @returns Updated program
 */
export async function saveCourseFlowMinor(
  programId: string,
  flowData: CourseFlowData
): Promise<ProgramRow> {
  try {
    // First, fetch the current program to get the version
    const { data: currentProgram, error: fetchError } = await db
      .from('program')
      .select('version')
      .eq('id', programId)
      .single();

    if (fetchError) {
      throw new CourseFlowSaveError('Failed to fetch current program version', fetchError);
    }

    // Calculate new minor version
    const currentVersion = currentProgram?.version ?? 1.0;
    const newVersion = typeof currentVersion === 'number'
      ? Number((currentVersion + 0.1).toFixed(1))
      : Number((parseFloat(String(currentVersion)) + 0.1).toFixed(1));

    // Update the program with new course flow and version
    const { data, error } = await db
      .from('program')
      .update({
        course_flow: flowData,
        version: newVersion,
        modified_at: new Date().toISOString()
      })
      .eq('id', programId)
      .select('id, university_id, name, program_type, version, created_at, modified_at, requirements, is_general_ed')
      .single();

    if (error) {
      throw new CourseFlowSaveError('Failed to save course flow with minor version update', error);
    }

    return data as ProgramRow;
  } catch (error) {
    if (error instanceof CourseFlowSaveError) {
      throw error;
    }
    throw new CourseFlowSaveError('Unexpected error saving course flow', error);
  }
}

/**
 * AUTHORIZED FOR ADVISORS ONLY
 * Saves course flow data as a new major version (creates duplicate with version + 1)
 * @param programId - ID of the program to duplicate
 * @param flowData - Course flow data to save
 * @returns New program with major version increment
 */
export async function saveCourseFlowMajor(
  programId: string,
  flowData: CourseFlowData
): Promise<ProgramRow> {
  try {
    // First, fetch the current program
    const { data: currentProgram, error: fetchError } = await db
      .from('program')
      .select('*')
      .eq('id', programId)
      .single();

    if (fetchError || !currentProgram) {
      throw new CourseFlowSaveError('Failed to fetch current program', fetchError);
    }

    // Calculate new major version
    const currentVersion = currentProgram.version ?? 1.0;
    const newVersion = typeof currentVersion === 'number'
      ? Math.floor(currentVersion) + 1
      : Math.floor(parseFloat(String(currentVersion))) + 1;

    // Create a new program entry with the incremented version
    const newProgramData = {
      university_id: currentProgram.university_id,
      name: currentProgram.name,
      program_type: currentProgram.program_type,
      version: newVersion,
      requirements: currentProgram.requirements,
      is_general_ed: currentProgram.is_general_ed,
      course_flow: flowData,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from('program')
      .insert(newProgramData)
      .select('id, university_id, name, program_type, version, created_at, modified_at, requirements, is_general_ed')
      .single();

    if (error) {
      throw new CourseFlowSaveError('Failed to create new program with major version', error);
    }

    return data as ProgramRow;
  } catch (error) {
    if (error instanceof CourseFlowSaveError) {
      throw error;
    }
    throw new CourseFlowSaveError('Unexpected error creating new major version', error);
  }
}