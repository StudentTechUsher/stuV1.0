import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logError, logInfo, logWarn } from '@/lib/logger';
import {
  buildAgentHandoffUrl,
  getLaunchConfig,
  normalizeBootstrapPayload,
  signAgentHandoffJwt,
} from '@/lib/grad-plan-agent/handoff';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CLEANUP_BATCH_SIZE = 100;

type ProfileRow = {
  id: string;
  email: string | null;
};

type StudentRow = {
  id: number;
  student_type: string | null;
  est_grad_date: string | null;
  est_grad_term: string | null;
  admission_year: number | null;
  is_transfer: boolean | string | null;
  work_status: string | null;
  career_goals: string | null;
  class_preferences: number[] | null;
  selected_programs: number[] | null;
  selected_interests: number[] | null;
  gpa: number | string | null;
};

type ClassPreferenceRow = {
  id: number;
  name: string;
};

type UserCoursesRow = {
  courses: unknown;
  inserted_at: string | null;
};

type ActivePlanRow = {
  id: number;
  plan_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  pending_approval: boolean;
  pending_edits: boolean;
  programs_in_plan: number[] | null;
  plan_details: unknown;
};

async function cleanupExpiredUnusedHandoffs(nowIso: string): Promise<number> {
  const { data: expiredRows, error: selectError } = await supabaseAdmin
    .from('agent_handoffs')
    .select('id')
    .is('used_at', null)
    .lt('expires_at', nowIso)
    .order('expires_at', { ascending: true })
    .limit(CLEANUP_BATCH_SIZE);

  if (selectError) {
    logWarn('Unable to query expired grad planner handoffs', {
      action: 'grad_plan_agent_handoff_cleanup_select',
      errorHint: selectError.message,
    });
    return 0;
  }

  const ids = (expiredRows ?? [])
    .map((row) => (typeof row?.id === 'string' ? row.id : ''))
    .filter((id): id is string => id.length > 0);

  if (ids.length === 0) return 0;

  const { error: deleteError } = await supabaseAdmin
    .from('agent_handoffs')
    .delete()
    .in('id', ids);

  if (deleteError) {
    logWarn('Unable to delete expired grad planner handoffs', {
      action: 'grad_plan_agent_handoff_cleanup_delete',
      errorHint: deleteError.message,
      count: ids.length,
    });
    return 0;
  }

  return ids.length;
}

export async function POST(_request: NextRequest) {
  let userIdForLog: string | undefined;

  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    userIdForLog = user.id;

    const config = getLaunchConfig();
    const supabase = await createSupabaseServerComponentClient();

    const [profileResult, studentResult, userCoursesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,email')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('student')
        .select('id,student_type,est_grad_date,est_grad_term,admission_year,is_transfer,work_status,career_goals,class_preferences,selected_programs,selected_interests,gpa')
        .eq('profile_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_courses')
        .select('courses,inserted_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      throw new Error(profileResult.error.message || 'Failed to load profile for handoff');
    }

    if (studentResult.error) {
      throw new Error(studentResult.error.message || 'Failed to load student data for handoff');
    }

    if (userCoursesResult.error) {
      throw new Error(userCoursesResult.error.message || 'Failed to load transcript data for handoff');
    }

    const profile = (profileResult.data as ProfileRow | null) ?? {
      id: user.id,
      email: user.email ?? null,
    };
    const student = studentResult.data as StudentRow | null;
    const userCourses = userCoursesResult.data as UserCoursesRow | null;

    const classPreferenceIds = Array.isArray(student?.class_preferences)
      ? student.class_preferences.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
      : [];

    let classPreferenceRows: ClassPreferenceRow[] = [];
    if (classPreferenceIds.length > 0) {
      const { data, error } = await supabase
        .from('class_preferences')
        .select('id,name')
        .in('id', classPreferenceIds);

      if (error) {
        throw new Error(error.message || 'Failed to load class preferences for handoff');
      }

      classPreferenceRows = (data ?? []) as ClassPreferenceRow[];
    }

    let activePlan: ActivePlanRow | null = null;
    {
      const { data, error } = await supabase
        .from('grad_plan')
        .select('id,plan_name,created_at,updated_at,pending_approval,pending_edits,programs_in_plan,plan_details')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(error.message || 'Failed to load active plan metadata for handoff');
      }

      activePlan = ((data ?? [])[0] as ActivePlanRow | undefined) ?? null;
    }

    const bootstrapPayload = normalizeBootstrapPayload({
      userId: user.id,
      profile,
      student,
      classPreferences: classPreferenceRows,
      userCourses,
      activePlan,
    });

    const nowIso = new Date().toISOString();
    const cleanupCount = await cleanupExpiredUnusedHandoffs(nowIso);

    const expiresAt = new Date(Date.now() + (config.ttlSeconds * 1000)).toISOString();

    const { data: handoffRow, error: insertError } = await supabaseAdmin
      .from('agent_handoffs')
      .insert({
        user_id: user.id,
        bootstrap_payload: bootstrapPayload,
        expires_at: expiresAt,
        used_at: null,
      })
      .select('id,expires_at')
      .single();

    if (insertError || !handoffRow?.id) {
      throw new Error(insertError?.message || 'Failed to create handoff record');
    }

    const token = await signAgentHandoffJwt({
      handoffId: handoffRow.id,
      userId: user.id,
      audience: config.audience,
      handoffSecret: config.handoffSecret,
      ttlSeconds: config.ttlSeconds,
    });

    const launchUrl = buildAgentHandoffUrl(config.agentBaseUrl, token);

    logInfo('Created grad planner handoff', {
      userId: user.id,
      action: 'grad_plan_agent_launch_created',
      count: cleanupCount,
      duration: config.ttlSeconds,
    });

    return NextResponse.redirect(launchUrl, { status: 303 });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : 'Failed to launch grad planner agent';

    logError('Grad planner launch failed', error, {
      userId: userIdForLog,
      action: 'grad_plan_agent_launch_failed',
    });

    const isConfigError = safeMessage === 'Grad planner handoff is not configured';

    return NextResponse.json(
      {
        success: false,
        error: isConfigError
          ? 'Grad planner handoff is not configured'
          : 'Failed to launch grad planner agent',
      },
      { status: 500 }
    );
  }
}
