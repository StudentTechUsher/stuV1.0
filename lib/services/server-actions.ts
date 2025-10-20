'use server';

// Centralized async server action wrappers. Each export must be an async function (Next.js requirement).

import { ValidationError } from 'yup';
import { decodeAnyAccessId, encodeAccessId } from '@/lib/utils/access-id';
import { validatePlanName } from '@/lib/utils/plan-name-validation';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { OrganizeCoursesIntoSemesters_ServerAction } from './openaiService';
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
} from './gradPlanService';
import {
    ChatbotSendMessage_ServerAction as _chatbotSendMessage,
    parseTranscriptCourses_ServerAction as _parseTranscriptCourses,
} from './openaiService';
import {
    fetchProgramsByUniversity as _fetchProgramsByUniversity,
    deleteProgram as _deleteProgram,
} from './programService';
import {
    fetchUserCoursesArray as _fetchUserCoursesArray,
    formatCoursesForDisplay,
    saveManualCourses as _saveManualCourses,
    updateUserCourseTags as _updateUserCourseTags,
    upsertUserCourses as _upsertUserCourses,
    type ParsedCourse,
} from './userCoursesService';

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

        const sanitizedPlan = await graduationPlanPayloadSchema.validate(planData, VALIDATION_OPTIONS);
        return await _submitGradPlanForApproval(userId, sanitizedPlan, programIds, planName);
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
    try {
        const sanitizedPlan = await graduationPlanPayloadSchema.validate(planDetails, VALIDATION_OPTIONS);
        return await _updateGradPlanDetailsAndAdvisorNotes(gradPlanId, sanitizedPlan, trimmedNotes);
    } catch (error) {
        if (error instanceof ValidationError) {
            return { success: false, error: error.errors.join('; ') };
        }
        throw error;
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
