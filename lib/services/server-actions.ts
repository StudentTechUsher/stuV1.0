'use server';

// Centralized async server action wrappers. Each export must be an async function (Next.js requirement).

import { ValidationError } from 'yup';
import { decodeAnyAccessId, encodeAccessId } from '@/lib/utils/access-id';
import { validatePlanName } from '@/lib/utils/plan-name-validation';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { OrganizeCoursesIntoSemesters_ServerAction } from './openaiService';
import { GetAiPrompt } from './aiDbService';
import {
    VALIDATION_OPTIONS,
    courseSelectionPayloadSchema,
    graduationPlanPayloadSchema,
    organizePromptInputSchema,
} from '@/lib/validation/schemas';
import {
    fetchGradPlanForEditing as _fetchGradPlanForEditing,
    fetchGradPlanById as _fetchGradPlanById,
    fetchPendingGradPlans as _fetchPendingGradPlans,
    updateGradPlanWithAdvisorNotes as _updateGradPlanWithAdvisorNotes,
    approveGradPlan as _approveGradPlan,
    submitGradPlanForApproval as _submitGradPlanForApproval,
    updateGradPlanDetails as _updateGradPlanDetails,
    updateGradPlanDetailsAndAdvisorNotes as _updateGradPlanDetailsAndAdvisorNotes,
    updateGradPlanName as _updateGradPlanName,
    deleteGradPlan as _deleteGradPlan,
    GetActiveGradPlan as _getActiveGradPlan,
    setGradPlanActive,
} from './gradPlanService';
import {
    fetchProfileBasicInfo as _fetchProfileBasicInfo,
    updateProfile as _updateProfile,
} from './profileService.server';
import {
    ChatbotSendMessage_ServerAction as _chatbotSendMessage,
    parseTranscriptCourses_ServerAction as _parseTranscriptCourses,
} from './openaiService';
import {
    fetchProgramsByUniversity as _fetchProgramsByUniversity,
    fetchProgramsBatch as _fetchProgramsBatch,
    deleteProgram as _deleteProgram,
} from './programService';
import {
    fetchUserCoursesArray as _fetchUserCoursesArray,
    fetchUserCourses as _fetchUserCourses,
    formatCoursesForDisplay,
    saveManualCourses as _saveManualCourses,
    updateUserCourseTags as _updateUserCourseTags,
    upsertUserCourses as _upsertUserCourses,
    type ParsedCourse,
} from './userCoursesService';
import {
    markAllNotificationsRead as _markAllNotificationsRead,
    deleteNotification as _deleteNotification,
    deleteAllReadNotifications as _deleteAllReadNotifications,
} from './notifService';

// AI organize courses (directly re-exported earlier - now wrapped for consistency if future decoration needed)
export async function organizeCoursesIntoSemestersAction(coursesData: unknown, prompt: unknown) {
    try {
        const [validatedCourses, validatedPrompt] = await Promise.all([
            courseSelectionPayloadSchema.validate(coursesData, VALIDATION_OPTIONS),
            organizePromptInputSchema.validate(prompt, VALIDATION_OPTIONS),
        ]);
        return await OrganizeCoursesIntoSemesters_ServerAction(validatedCourses, validatedPrompt);
    } catch (error) {
        if (error instanceof ValidationError) {
            return {
                success: false,
                message: `Invalid planner request: ${error.errors.join('; ')}`,
            };
        }
        throw error;
    }
}

// Get AI prompt from database
export async function getAiPromptAction(promptName: string): Promise<string | null> {
    return await GetAiPrompt(promptName);
}

// Decode access ID
export async function decodeAccessIdServerAction(accessId: string): Promise<{ success: boolean; gradPlanId?: string; error?: string }> {
    try {
        const gradPlanId = decodeAnyAccessId(accessId);
        if (!gradPlanId) return { success: false, error: 'Invalid or expired access link' };
        return { success: true, gradPlanId };
    } catch (error) {
        console.error('Error decoding access ID:', error);
        return { success: false, error: 'Failed to decode access ID' };
    }
}

// Grad plan related
export async function fetchGradPlanForEditing(gradPlanId: string) {
    return await _fetchGradPlanForEditing(gradPlanId);
}

export async function fetchGradPlanById(gradPlanId: string) {
    return await _fetchGradPlanById(gradPlanId);
}

export async function fetchPendingGradPlans() {
    return await _fetchPendingGradPlans();
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own grad plan only)
 * Fetches the active grad plan for a user and returns program details
 */
export async function fetchActiveGradPlanProgramsAction(profileId: string) {
    try {
        const gradPlan = await _getActiveGradPlan(profileId);

        if (!gradPlan || !gradPlan.programs_in_plan || !Array.isArray(gradPlan.programs_in_plan) || gradPlan.programs_in_plan.length === 0) {
            return { success: true, hasGradPlan: false, programs: [] };
        }

        // Convert to strings and fetch program details
        const programIds = gradPlan.programs_in_plan.map(String);
        const programs = await _fetchProgramsBatch(programIds);

        return {
            success: true,
            hasGradPlan: true,
            programs: programs.map(p => ({
                id: String(p.id),
                name: p.name,
                program_type: p.program_type,
            }))
        };
    } catch (error) {
        console.error('Error fetching active grad plan programs:', error);
        return { success: false, error: 'Failed to fetch grad plan programs' };
    }
}

export async function updateGradPlanWithAdvisorNotes(gradPlanId: string, advisorNotes: string) {
    // Enforce advisor-only access on server
    try {
        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        const { data: profile, error: profileError } = await supabaseSrv
            .from('profiles')
            .select('role_id')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError || !profile || profile.role_id !== 2) {
            return { success: false, error: 'Not authorized' };
        }
    } catch (error) {
        console.error('Authorization check failed:', error);
        return { success: false, error: 'Authorization check failed' };
    }
    return await _updateGradPlanWithAdvisorNotes(gradPlanId, advisorNotes);
}

export async function approveGradPlan(gradPlanId: string) {
    // Advisor-only safeguard
    try {
        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' } as { success: boolean; error?: string };
        }
        const { data: profile, error: profileError } = await supabaseSrv
            .from('profiles')
            .select('role_id')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError || !profile || profile.role_id !== 2) {
            return { success: false, error: 'Not authorized' } as { success: boolean; error?: string };
        }
    } catch (error) {
        console.error('Authorization check failed:', error);
        return { success: false, error: 'Authorization check failed' } as { success: boolean; error?: string };
    }
    return await _approveGradPlan(gradPlanId);
}

export async function submitGradPlanForApproval(userId: string, planData: unknown, programIds: number[], planName?: string) {
    try {
        // Validate plan name if provided
        if (planName !== undefined && planName !== null && planName.trim() !== '') {
            const nameValidation = validatePlanName(planName, { allowEmpty: false });
            if (!nameValidation.isValid) {
                return { success: false, message: nameValidation.error };
            }
            planName = nameValidation.sanitizedValue;
        }

        // The planData is just the array of terms, not the full object expected by graduationPlanPayloadSchema
        // We'll just validate that it's an array and pass it through
        if (!Array.isArray(planData)) {
            return { success: false, message: 'Invalid plan data format. Expected an array of terms.' };
        }

        // Pass the raw planData (array of terms) directly to the service
        return await _submitGradPlanForApproval(userId, planData, programIds, planName);
    } catch (error) {
        if (error instanceof ValidationError) {
            return { success: false, message: error.errors.join('; ') };
        }
        throw error;
    }
}

// Save (non-approval) plan edits
export async function updateGradPlanDetailsAction(gradPlanId: string, planDetails: unknown) {
    // Advisor-only safeguard
    try {
        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        const { data: profile, error: profileError } = await supabaseSrv
            .from('profiles')
            .select('role_id')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError || !profile || profile.role_id !== 2) {
            return { success: false, error: 'Not authorized' };
        }
    } catch (error) {
        console.error('Authorization check failed:', error);
        return { success: false, error: 'Authorization check failed' };
    }
    try {
        const sanitizedPlan = await graduationPlanPayloadSchema.validate(planDetails, VALIDATION_OPTIONS);
        return await _updateGradPlanDetails(gradPlanId, sanitizedPlan);
    } catch (error) {
        if (error instanceof ValidationError) {
            return { success: false, error: error.errors.join('; ') };
        }
        throw error;
    }
}

/**
 * AUTHORIZED FOR STUDENTS - Update their own graduation plan
 * Students can only update plans they own
 */
export async function updateStudentGradPlanAction(gradPlanId: string, planDetails: unknown) {
    try {
        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Get student_id from profile
        const { data: studentData, error: studentError } = await supabaseSrv
            .from('student')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (studentError || !studentData) {
            console.error('Error fetching student record:', studentError);
            return { success: false, error: 'Student record not found' };
        }

        // Verify the student owns this grad plan
        const { data: gradPlan, error: planError } = await supabaseSrv
            .from('grad_plan')
            .select('student_id')
            .eq('id', gradPlanId)
            .single();

        if (planError || !gradPlan) {
            console.error('Error fetching grad plan:', planError);
            return { success: false, error: 'Graduation plan not found' };
        }

        if (gradPlan.student_id !== studentData.id) {
            return { success: false, error: 'Not authorized to edit this plan' };
        }

        // Update the plan (planDetails should be the plan_details object)
        // No validation needed - just pass it through to the service
        return await _updateGradPlanDetails(gradPlanId, planDetails);
    } catch (error) {
        console.error('Error updating student grad plan:', error);
        return { success: false, error: 'Failed to update graduation plan' };
    }
}

/**
 * AUTHORIZED FOR STUDENTS - Set a graduation plan as active
 * Students can only activate plans they own
 */
export async function setGradPlanActiveAction(gradPlanId: string) {
    try {
        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Get student_id from profile
        const { data: studentData, error: studentError } = await supabaseSrv
            .from('student')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (studentError || !studentData) {
            console.error('Error fetching student record:', studentError);
            return { success: false, error: 'Student record not found' };
        }

        // Call the service function
        return await setGradPlanActive(gradPlanId, studentData.id);
    } catch (error) {
        console.error('Error setting active grad plan:', error);
        return { success: false, error: 'Failed to set active graduation plan' };
    }
}

// Save plan edits + advisor notes (suggestions) together
export async function updateGradPlanDetailsAndAdvisorNotesAction(gradPlanId: string, planDetails: unknown, advisorNotes: string) {
    // Enforce advisor-only access on server (most critical: suggestions/notes)
    try {
        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        const { data: profile, error: profileError } = await supabaseSrv
            .from('profiles')
            .select('role_id')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError || !profile || profile.role_id !== 2) {
            return { success: false, error: 'Not authorized' };
        }
    } catch (error) {
        console.error('Authorization check failed:', error);
        return { success: false, error: 'Authorization check failed' };
    }
    const trimmedNotes = advisorNotes?.trim() ?? '';
    if (trimmedNotes.length > 4000) {
        return { success: false, error: 'Advisor notes exceed 4000 characters' };
    }
    // Basic validation: ensure planDetails is provided and is an object or array
    if (!planDetails || (typeof planDetails !== 'object')) {
        return { success: false, error: 'Plan details are required' };
    }
    try {
        return await _updateGradPlanDetailsAndAdvisorNotes(gradPlanId, planDetails, trimmedNotes);
    } catch (error) {
        console.error('Error updating grad plan details and advisor notes:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update plan'
        };
    }
}

// Update plan name (students can update their own; advisors/admins allowed)
export async function updateGradPlanNameAction(gradPlanId: string, planName: string) {
    try {
        console.log('🔍 Validating plan name:', planName);

        // Validate plan name - do NOT pass allowEmpty option, let it default
        let validation;
        try {
            validation = validatePlanName(planName);
            console.log('✅ Validation result:', validation);
        } catch (validationError) {
            console.error('❌ Validation function threw error:', validationError);
            return { success: false, error: 'Plan name validation failed. Please use only letters, numbers, and basic punctuation.' };
        }

        if (!validation.isValid) {
            console.log('❌ Plan name validation failed:', validation.error);
            return { success: false, error: validation.error };
        }
        const sanitizedName = validation.sanitizedValue;
        console.log('✅ Sanitized name:', sanitizedName);

        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data: profile, error: profileError } = await supabaseSrv
            .from('profiles')
            .select('role_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError || !profile) {
            console.error('❌ Profile error:', profileError);
            return { success: false, error: 'Unable to verify user role' };
        }

        const { data: planRecord, error: planError } = await supabaseSrv
            .from('grad_plan')
            .select('student_id')
            .eq('id', gradPlanId)
            .maybeSingle();

        if (planError || !planRecord) {
            console.error('❌ Plan record error:', planError);
            return { success: false, error: 'Graduation plan not found' };
        }

        // Students can only rename their own plans
        if (profile.role_id === 3) {
            const { data: studentData, error: studentError } = await supabaseSrv
                .from('student')
                .select('id')
                .eq('profile_id', user.id)
                .maybeSingle();

            if (studentError || !studentData || studentData.id !== planRecord.student_id) {
                console.error('❌ Student authorization error:', studentError);
                return { success: false, error: 'Not authorized to rename this plan' };
            }
        }

        const result = await _updateGradPlanName(gradPlanId, sanitizedName);
        console.log('✅ Plan name update result:', result);
        return result;
    } catch (error) {
        console.error('❌ Unexpected error updating plan name:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return { success: false, error: 'Unable to update plan name. Please try again.' };
    }
}

// Delete graduation plan (students can delete their own non-active plans)
export async function deleteGradPlanAction(gradPlanId: string) {
    try {
        const supabaseSrv = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabaseSrv.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data: profile, error: profileError } = await supabaseSrv
            .from('profiles')
            .select('role_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError || !profile) {
            return { success: false, error: 'Unable to verify user role' };
        }

        const { data: planRecord, error: planError } = await supabaseSrv
            .from('grad_plan')
            .select('student_id, is_active')
            .eq('id', gradPlanId)
            .maybeSingle();

        if (planError || !planRecord) {
            return { success: false, error: 'Graduation plan not found' };
        }

        // Students can only delete their own plans
        if (profile.role_id === 3) {
            const { data: studentData, error: studentError } = await supabaseSrv
                .from('student')
                .select('id')
                .eq('profile_id', user.id)
                .maybeSingle();

            if (studentError || !studentData || studentData.id !== planRecord.student_id) {
                return { success: false, error: 'Not authorized to delete this plan' };
            }
        }

        // Call the service function to delete
        return await _deleteGradPlan(gradPlanId);
    } catch (error) {
        console.error('❌ Unexpected error deleting grad plan:', error);
        return { success: false, error: 'Unable to delete plan. Please try again.' };
    }
}

// Program related
export async function fetchProgramsByUniversity(universityId: number) {
    return await _fetchProgramsByUniversity(universityId);
}

export async function deleteProgram(programId: string) {
    return await _deleteProgram(programId);
}

// Issue a server-format access ID (HMAC) for a grad plan id
export async function issueGradPlanAccessId(gradPlanId: string): Promise<string> {
    return encodeAccessId(gradPlanId);
}

// Chatbot message server action wrapper
export async function chatbotSendMessage(message: string, sessionId?: string) {
    return await _chatbotSendMessage({ message, sessionId });
}

// User courses related
export async function fetchUserCoursesAction(userId: string) {
    try {
        const supabase = await createSupabaseServerComponentClient();
        const courses = await _fetchUserCoursesArray(supabase, userId);
        return { success: true, courses: formatCoursesForDisplay(courses) };
    } catch (error) {
        console.error('Error fetching user courses:', error);
        return { success: false, error: 'Failed to fetch user courses' };
    }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Fetches user courses metadata including last updated date
 */
export async function fetchUserCoursesMetadataAction(userId: string) {
    try {
        const supabase = await createSupabaseServerComponentClient();
        const record = await _fetchUserCourses(supabase, userId);

        if (!record) {
            return { success: true, hasData: false, lastUpdated: null };
        }

        return {
            success: true,
            hasData: true,
            lastUpdated: record.inserted_at,
            courseCount: record.courses?.length || 0
        };
    } catch (error) {
        console.error('Error fetching user courses metadata:', error);
        return { success: false, error: 'Failed to fetch user courses metadata' };
    }
}

// Transcript parsing with AI
export async function parseTranscriptCoursesAction(args: {
    transcriptText: string;
    userId?: string | null;
    sessionId?: string;
}) {
    return await _parseTranscriptCourses(args);
}

/**
 * Server action to save manual courses
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 */
export async function saveManualCoursesAction(
    userId: string,
    manualCourses: ParsedCourse[],
    options?: { existingParsed?: ParsedCourse[] }
) {
    try {
        // Verify user is authenticated and owns the data
        const supabase = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        if (user.id !== userId) {
            return { success: false, error: 'Not authorized to modify this data' };
        }

        const result = await _saveManualCourses(supabase, userId, manualCourses, options);
        return { success: true, manualCount: result.manualCount };
    } catch (error) {
        console.error('Error saving manual courses:', error);
        return { success: false, error: 'Failed to save manual courses' };
    }
}

/**
 * Server action to update course tags
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 */
export async function updateUserCourseTagsAction(
    userId: string,
    courseId: string,
    tags: string[]
) {
    try {
        // Verify user is authenticated and owns the data
        const supabase = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('❌ updateUserCourseTagsAction: User not authenticated');
            return { success: false, error: 'Not authenticated' };
        }

        if (user.id !== userId) {
            console.error('❌ updateUserCourseTagsAction: User ID mismatch', {
                authenticatedUser: user.id,
                requestedUserId: userId,
            });
            return { success: false, error: 'Not authorized to modify this data' };
        }

        console.log('✅ updateUserCourseTagsAction: Auth verified, calling service', {
            userId,
            courseId,
            tags,
        });

        const result = await _updateUserCourseTags(supabase, userId, courseId, tags);

        console.log('✅ updateUserCourseTagsAction: Service call successful', {
            success: result.success,
            tags: result.tags,
        });

        return { success: true, tags: result.tags };
    } catch (error) {
        console.error('❌ updateUserCourseTagsAction: Error updating course tags:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        }
        return { success: false, error: 'Failed to update course tags' };
    }
}

/**
 * Server action to update all user courses
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 */
export async function updateUserCoursesAction(
    userId: string,
    courses: ParsedCourse[]
) {
    try {
        // Verify user is authenticated and owns the data
        const supabase = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        if (user.id !== userId) {
            return { success: false, error: 'Not authorized to modify this data' };
        }

        const result = await _upsertUserCourses(supabase, userId, courses);
        return { success: true, courseCount: result.courseCount };
    } catch (error) {
        console.error('Error updating user courses:', error);
        return { success: false, error: 'Failed to update courses' };
    }
}

// Profile related
export async function fetchProfileBasicInfoAction(userId: string) {
    return await _fetchProfileBasicInfo(userId);
}

export async function updateProfileAction(userId: string, updates: Record<string, string | null>) {
    try {
        await _updateProfile(userId, updates);
        return { success: true };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' };
    }
}

/**
 * Server action to check if student record exists
 * AUTHORIZATION: AUTHENTICATED USERS
 */
export async function hasStudentRecordAction(userId: string) {
    try {
        const { hasStudentRecord } = await import('./profileService.server');
        const exists = await hasStudentRecord(userId);
        return { success: true, exists };
    } catch (error) {
        console.error('Error checking student record:', error);
        return { success: false, exists: false, error: error instanceof Error ? error.message : 'Failed to check student record' };
    }
}

/**
 * Server action for chatbot profile updates
 * AUTHORIZATION: STUDENTS AND ABOVE (own profile only)
 */
export async function updateProfileForChatbotAction(
    userId: string,
    data: {
        estGradDate?: string | null;
        estGradSem?: string | null;
        careerGoals?: string | null;
        potentialCareerPaths?: string | null;
        admissionYear?: number | null;
        isTransfer?: boolean | null;
    }
) {
    try {
        // Verify user is authenticated and owns the profile
        const supabase = await createSupabaseServerComponentClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        if (user.id !== userId) {
            return { success: false, error: 'Not authorized to modify this profile' };
        }

        // Build updates for student table
        const studentUpdates: Record<string, string | number | boolean | null> = {};

        if (data.estGradDate !== undefined) {
            studentUpdates.est_grad_date = data.estGradDate;
        }
        if (data.estGradSem !== undefined) {
            // Map est_grad_sem to est_grad_plan in student table
            studentUpdates.est_grad_plan = data.estGradSem;
        }
        if (data.careerGoals !== undefined) {
            studentUpdates.career_goals = data.careerGoals;
        }
        if (data.potentialCareerPaths !== undefined) {
            studentUpdates.targeted_career = data.potentialCareerPaths;
        }
        if (data.admissionYear !== undefined) {
            studentUpdates.admission_year = data.admissionYear;
        }
        if (data.isTransfer !== undefined) {
            studentUpdates.is_transfer = data.isTransfer;
        }
        // Note: selected_interests field expects int8[] (interest IDs from lookup table)
        // For free-form text interests from the grad plan wizard, we're not saving those
        // as they're meant for informational purposes during the planning process only

        // Update student table if there are updates
        if (Object.keys(studentUpdates).length > 0) {
            const { error } = await supabase
                .from('student')
                .update(studentUpdates)
                .eq('profile_id', userId);

            if (error) {
                throw new Error(`Failed to update student record: ${error.message}`);
            }
        }

        return {
            success: true,
            data: {
                estGradDate: data.estGradDate ?? null,
                estGradSem: data.estGradSem ?? null,
                careerGoals: data.careerGoals ?? null,
                potentialCareerPaths: data.potentialCareerPaths ?? null,
            },
        };
    } catch (error) {
        console.error('Error updating profile for chatbot:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update profile',
        };
    }
}

// Course offering related actions
import {
    getColleges as _getColleges,
    getDepartmentCodes as _getDepartmentCodes,
    getCoursesByDepartment as _getCoursesByDepartment,
} from './courseOfferingService';

/**
 * Server action to get colleges for a university
 * AUTHORIZATION: STUDENTS AND ABOVE
 */
export async function getCollegesAction(universityId: number) {
    try {
        const colleges = await _getColleges(universityId);
        return { success: true, colleges };
    } catch (error) {
        console.error('Error fetching colleges:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch colleges',
        };
    }
}

/**
 * Server action to get department codes for a university and college
 * AUTHORIZATION: STUDENTS AND ABOVE
 */
export async function getDepartmentCodesAction(universityId: number, college: string) {
    try {
        const departments = await _getDepartmentCodes(universityId, college);
        return { success: true, departments };
    } catch (error) {
        console.error('Error fetching department codes:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch department codes',
        };
    }
}

/**
 * Server action to get courses by department
 * AUTHORIZATION: STUDENTS AND ABOVE
 */
export async function getCoursesByDepartmentAction(
    universityId: number,
    college: string,
    departmentCode: string
) {
    try {
        const courses = await _getCoursesByDepartment(universityId, college, departmentCode);
        return { success: true, courses };
    } catch (error) {
        console.error('Error fetching courses by department:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch courses',
        };
    }
}

/**
 * Server action to get a single course by course code
 * AUTHORIZATION: STUDENTS AND ABOVE
 */
export async function getCourseByCodeAction(
    universityId: number,
    courseCode: string
) {
    'use server';
    try {
        const { getCourseByCode } = await import('./courseOfferingService');
        const course = await getCourseByCode(universityId, courseCode);
        return { success: true, course };
    } catch (error) {
        console.error('Error fetching course by code:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch course',
            course: null,
        };
    }
}

/**
 * Server action to mark all notifications as read for the current user
 * AUTHORIZATION: USERS can only mark their own notifications
 */
export async function markAllNotificationsReadAction(userId: string) {
    try {
        const result = await _markAllNotificationsRead(userId);
        return result;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to mark notifications as read',
        };
    }
}

/**
 * Server action to delete a single notification
 * AUTHORIZATION: USERS can only delete their own notifications
 */
export async function deleteNotificationAction(notifId: string, userId: string) {
    try {
        const result = await _deleteNotification(notifId, userId);
        return result;
    } catch (error) {
        console.error('Error deleting notification:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete notification',
        };
    }
}

/**
 * Server action to delete all read notifications for the current user
 * AUTHORIZATION: USERS can only delete their own notifications
 */
export async function deleteAllReadNotificationsAction(userId: string) {
    try {
        const result = await _deleteAllReadNotifications(userId);
        return result;
    } catch (error) {
        console.error('Error deleting read notifications:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete read notifications',
        };
    }
}

/**
 * Server action to approve a pending student
 * AUTHORIZATION: ADVISORS AND ADMINS ONLY
 */
export async function approveStudentAction(
    studentId: string,
    fname: string,
    lname: string
) {
    try {
        const { approveStudent } = await import('./profileService.server');
        await approveStudent(studentId, fname, lname);
        return {
            success: true,
        };
    } catch (error) {
        console.error('Error approving student:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to approve student',
        };
    }
}
