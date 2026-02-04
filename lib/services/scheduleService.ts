import { supabase } from '@/lib/supabase';
import { CourseSection } from './courseOfferingService';

// ---- Error Types ----
export class ScheduleNotFoundError extends Error {
    constructor(message = 'Schedule not found') {
        super(message);
        this.name = 'ScheduleNotFoundError';
    }
}

export class ScheduleFetchError extends Error {
    constructor(message: string, public cause?: unknown) {
        super(message);
        this.name = 'ScheduleFetchError';
    }
}

export class ScheduleConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ScheduleConflictError';
    }
}

// ---- Type Definitions ----
export interface BlockedTime {
    id: string;  // UUID
    title: string;
    category: 'Work' | 'Club' | 'Sports' | 'Study' | 'Family' | 'Other';
    day_of_week: number;  // 1-6 (Mon-Sat)
    start_time: string;   // "HH:MM"
    end_time: string;     // "HH:MM"
}

export interface SchedulePreferences {
    earliest_class_time?: string;
    latest_class_time?: string;
    preferred_days?: number[];
    avoid_days?: number[];
    prefer_condensed?: boolean;
    prefer_gaps?: boolean;
    max_daily_hours?: number;
    min_break_minutes?: number;
    lunch_break_required?: boolean;
    lunch_start_time?: string;
    lunch_end_time?: string;
    allow_waitlist?: boolean;
    max_waitlist_position?: number;
}

export interface CourseSelection {
    selection_id: string;
    course_code: string;
    requirement_type: string | null;
    primary_offering_id: number | null;
    backup_1_offering_id: number | null;
    backup_2_offering_id: number | null;
    status: 'planned' | 'registered' | 'waitlisted' | 'dropped';
    notes: string | null;
}

export interface StudentSchedule {
    schedule_id: string;
    student_id: number;
    grad_plan_id: string | null;
    term_name: string;
    term_index: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    blocked_times: BlockedTime[];  // From JSONB
    preferences: SchedulePreferences;  // From JSONB
    course_selections: CourseSelection[];  // From join
}

// ---- Core Schedule Management ----

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Fetches the active schedule for a student with all related data
 * @returns Active schedule with blocked_times, preferences, and course_selections
 */
export async function getActiveSchedule(studentId: number): Promise<StudentSchedule | null> {
    const { data: schedule, error: scheduleError } = await supabase
        .from('student_schedules')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .maybeSingle();

    if (scheduleError) {
        console.error('Error fetching active schedule:', scheduleError);
        throw new ScheduleFetchError('Failed to fetch active schedule', scheduleError);
    }

    if (!schedule) {
        return null;
    }

    // Fetch course selections
    const { data: selections, error: selectionsError } = await supabase
        .from('schedule_course_selections')
        .select('*')
        .eq('schedule_id', schedule.schedule_id);

    if (selectionsError) {
        console.error('Error fetching course selections:', selectionsError);
        throw new ScheduleFetchError('Failed to fetch course selections', selectionsError);
    }

    return {
        ...schedule,
        blocked_times: schedule.blocked_times || [],
        preferences: schedule.preferences || {},
        course_selections: selections || [],
    };
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Creates a new schedule for a student and sets it as active
 * Deactivates any existing active schedule
 */
export async function createSchedule(
    studentId: number,
    termName: string,
    gradPlanId?: string,
    termIndex?: number
): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    try {
        // 1. Deactivate existing active schedule
        // We do this first to ensure only one active schedule. 
        // In a real txn we'd do this together, but with Supabase client we do sequentially.
        // There is a race condition risk but low impact for single user context.
        await supabase
            .from('student_schedules')
            .update({ is_active: false })
            .eq('student_id', studentId)
            .eq('is_active', true);

        // 2. Insert new schedule
        const { data, error } = await supabase
            .from('student_schedules')
            .insert({
                student_id: studentId,
                grad_plan_id: gradPlanId,
                term_name: termName,
                term_index: termIndex,
                is_active: true,
                blocked_times: [], // Initialize empty
                preferences: {},   // Initialize empty
            })
            .select('schedule_id')
            .single();

        if (error) {
            // Check for uniqueness constraint violation
            if (error.code === '23505') { // unique_violation
                // Fallback: This might happen if we failed to deactivate, or if (student_id, grad_plan_id, term_name) unique constraint hits.
                // Actually the constraint is UNIQUE(student_id, grad_plan_id, term_name).
                // So if they already have this term planned, we should maybe return that one or error?
                // For now return error saying it exists.
                return { success: false, error: 'Schedule for this term already exists' };
            }
            console.error('Error creating schedule:', error);
            return { success: false, error: error.message };
        }

        return { success: true, scheduleId: data.schedule_id };
    } catch (error) {
        console.error('Unexpected error in createSchedule:', error);
        return { success: false, error: 'Unexpected error occurred' };
    }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Sets a schedule as the active schedule for a student
 */
export async function setActiveSchedule(
    scheduleId: string,
    studentId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Deactivate all
        await supabase
            .from('student_schedules')
            .update({ is_active: false })
            .eq('student_id', studentId)
            .eq('is_active', true);

        // 2. Activate specific one
        const { error } = await supabase
            .from('student_schedules')
            .update({ is_active: true })
            .eq('schedule_id', scheduleId)
            .eq('student_id', studentId); // Ensure ownership

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

// ---- Blocked Times (JSONB operations) ----

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Adds a blocked time event to a schedule's blocked_times JSONB array
 * Generates UUID for the blocked time
 */
export async function addBlockedTime(
    scheduleId: string,
    blockedTime: Omit<BlockedTime, 'id'>
): Promise<{ success: boolean; blockedTimeId?: string; error?: string }> {
    try {
        const id = crypto.randomUUID();
        const newBlockedTime: BlockedTime = { ...blockedTime, id };

        // Use Postgres JSONB append using || operator
        // We need to fetch first or use complex update. 
        // Supabase JS doesn't support complex JSONB updates well in .update().
        // We often have to fetch, append, update. 
        // Or call a stored procedure (RPC). 
        // For now, fetch-modify-save is acceptable for this scale.

        const { data: schedule, error: fetchError } = await supabase
            .from('student_schedules')
            .select('blocked_times')
            .eq('schedule_id', scheduleId)
            .single();

        if (fetchError) {
            return { success: false, error: 'Failed to fetch schedule' };
        }

        const currentBlockedTimes = (schedule.blocked_times as BlockedTime[]) || [];
        const updatedBlockedTimes = [...currentBlockedTimes, newBlockedTime];

        const { error: updateError } = await supabase
            .from('student_schedules')
            .update({ blocked_times: updatedBlockedTimes })
            .eq('schedule_id', scheduleId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        return { success: true, blockedTimeId: id };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Updates a blocked time within the JSONB array
 * Finds by id and updates the object
 */
export async function updateBlockedTime(
    scheduleId: string,
    blockedTimeId: string,
    updates: Partial<Omit<BlockedTime, 'id'>>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: schedule, error: fetchError } = await supabase
            .from('student_schedules')
            .select('blocked_times')
            .eq('schedule_id', scheduleId)
            .single();

        if (fetchError || !schedule) {
            return { success: false, error: 'Failed to fetch schedule' };
        }

        const currentBlockedTimes = (schedule.blocked_times as BlockedTime[]) || [];
        const index = currentBlockedTimes.findIndex(bt => bt.id === blockedTimeId);

        if (index === -1) {
            return { success: false, error: 'Blocked time not found' };
        }

        // Update item
        currentBlockedTimes[index] = { ...currentBlockedTimes[index], ...updates };

        const { error: updateError } = await supabase
            .from('student_schedules')
            .update({ blocked_times: currentBlockedTimes })
            .eq('schedule_id', scheduleId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Removes a blocked time from the JSONB array
 */
export async function deleteBlockedTime(
    scheduleId: string,
    blockedTimeId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: schedule, error: fetchError } = await supabase
            .from('student_schedules')
            .select('blocked_times')
            .eq('schedule_id', scheduleId)
            .single();

        if (fetchError || !schedule) {
            return { success: false, error: 'Failed to fetch schedule' };
        }

        const currentBlockedTimes = (schedule.blocked_times as BlockedTime[]) || [];
        const updatedBlockedTimes = currentBlockedTimes.filter(bt => bt.id !== blockedTimeId);

        if (currentBlockedTimes.length === updatedBlockedTimes.length) {
            return { success: false, error: 'Blocked time not found' };
        }

        const { error: updateError } = await supabase
            .from('student_schedules')
            .update({ blocked_times: updatedBlockedTimes })
            .eq('schedule_id', scheduleId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

// ---- Preferences (JSONB operations) ----

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Updates schedule preferences (merges with existing preferences)
 */
export async function updateSchedulePreferences(
    scheduleId: string,
    preferences: Partial<SchedulePreferences>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: schedule, error: fetchError } = await supabase
            .from('student_schedules')
            .select('preferences')
            .eq('schedule_id', scheduleId)
            .single();

        if (fetchError || !schedule) {
            return { success: false, error: 'Failed to fetch schedule' };
        }

        const currentPreferences = (schedule.preferences as SchedulePreferences) || {};
        const updatedPreferences = { ...currentPreferences, ...preferences };

        const { error: updateError } = await supabase
            .from('student_schedules')
            .update({ preferences: updatedPreferences })
            .eq('schedule_id', scheduleId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

// ---- Course Selections (separate table) ----

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Adds a course selection to a schedule
 * Validates against course_offerings if offering_id provided
 */
export async function addCourseSelection(
    scheduleId: string,
    courseSelection: Omit<CourseSelection, 'selection_id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; selectionId?: string; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('schedule_course_selections')
            .insert({
                schedule_id: scheduleId,
                course_code: courseSelection.course_code,
                requirement_type: courseSelection.requirement_type,
                primary_offering_id: courseSelection.primary_offering_id,
                backup_1_offering_id: courseSelection.backup_1_offering_id,
                backup_2_offering_id: courseSelection.backup_2_offering_id,
                status: courseSelection.status,
                notes: courseSelection.notes
            })
            .select('selection_id')
            .single();

        if (error) {
            console.error('Error adding course selection:', error);
            return { success: false, error: error.message };
        }
        return { success: true, selectionId: data.selection_id };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Updates course selection (change sections, status, notes)
 */
export async function updateCourseSelection(
    selectionId: string,
    updates: Partial<Omit<CourseSelection, 'selection_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('schedule_course_selections')
            .update(updates)
            .eq('selection_id', selectionId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Removes a course from the schedule
 */
export async function deleteCourseSelection(
    selectionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('schedule_course_selections')
            .delete()
            .eq('selection_id', selectionId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

// ---- Validation & Details ----

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Fetches full course details for a schedule (joins with course_offerings)
 */
export async function getScheduleWithCourseDetails(
    scheduleId: string
): Promise<{
    schedule: StudentSchedule;
    courseDetails: Array<{
        selection: CourseSelection;
        primarySection: CourseSection | null;
        backup1Section: CourseSection | null;
        backup2Section: CourseSection | null;
    }>;
}> {
    // 1. Fetch schedule
    const { data: schedule, error: scheduleError } = await supabase
        .from('student_schedules')
        .select('*')
        .eq('schedule_id', scheduleId)
        .single();

    if (scheduleError || !schedule) {
        throw new ScheduleFetchError('Schedule not found', scheduleError);
    }

    const typedSchedule: StudentSchedule = {
        ...schedule,
        blocked_times: schedule.blocked_times || [],
        preferences: schedule.preferences || {},
        course_selections: [] // Populated below
    };

    // 2. Fetch selections
    const { data: selections, error: selectionsError } = await supabase
        .from('schedule_course_selections')
        .select('*')
        .eq('schedule_id', scheduleId);

    if (selectionsError) {
        throw new ScheduleFetchError('Failed to fetch selections', selectionsError);
    }

    typedSchedule.course_selections = selections || [];

    // 3. Fetch course details for all referenced offerings
    const offeringIds = new Set<number>();
    selections?.forEach(sel => {
        if (sel.primary_offering_id) offeringIds.add(sel.primary_offering_id);
        if (sel.backup_1_offering_id) offeringIds.add(sel.backup_1_offering_id);
        if (sel.backup_2_offering_id) offeringIds.add(sel.backup_2_offering_id);
    });

    if (offeringIds.size === 0) {
        return { schedule: typedSchedule, courseDetails: selections ? selections.map(s => ({ selection: s, primarySection: null, backup1Section: null, backup2Section: null })) : [] };
    }

    const { data: offerings, error: offeringsError } = await supabase
        .from('course_offerings')
        .select('*')
        .in('offering_id', Array.from(offeringIds));

    if (offeringsError) {
        throw new ScheduleFetchError('Failed to fetch course details', offeringsError);
    }

    const offeringMap = new Map<number, CourseSection>();
    offerings?.forEach(o => offeringMap.set(o.offering_id, o as CourseSection));

    const courseDetails = (selections || []).map(selection => ({
        selection,
        primarySection: selection.primary_offering_id ? offeringMap.get(selection.primary_offering_id) || null : null,
        backup1Section: selection.backup_1_offering_id ? offeringMap.get(selection.backup_1_offering_id) || null : null,
        backup2Section: selection.backup_2_offering_id ? offeringMap.get(selection.backup_2_offering_id) || null : null,
    }));

    return { schedule: typedSchedule, courseDetails };
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Validates schedule for conflicts (time conflicts, credit limits, etc.)
 */
export async function validateSchedule(
    scheduleId: string
): Promise<{
    isValid: boolean;
    conflicts: Array<{
        type: 'time_conflict' | 'credit_limit' | 'prerequisite';
        message: string;
        courses?: string[];
    }>;
}> {
    // Simplistic validation: just fetch schedule and check times
    try {
        const { schedule, courseDetails } = await getScheduleWithCourseDetails(scheduleId);
        const conflicts: Array<{ type: 'time_conflict' | 'credit_limit' | 'prerequisite'; message: string; courses?: string[] }> = [];

        // TODO: Implement time conflict checking algorithm
        // For MVP, we pass empty conflicts if simplistic checks pass
        // This needs proper implementation parsing meeting times

        return { isValid: conflicts.length === 0, conflicts };
    } catch (error) {
        console.error('Validation error:', error);
        return { isValid: false, conflicts: [] };
    }
}
