"use server";
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import type { NotificationPreferencesPayload } from '@/types/notification-preferences';
import { buildNotificationPreferences } from '@/helpers/notification-preferences';
import type { AdvisorStudentRow } from './profileService';

export interface ProfileNotificationSummary {
  id: string;
  role_id: number;
  notif_preferences: NotificationPreferencesPayload | null;
}

/** Fetch the authenticated user's profile with notification preferences for server components. */
export async function getProfileNotificationSummary(profileId: string): Promise<ProfileNotificationSummary | null> {
  try {
    const supabaseSrv = await createSupabaseServerComponentClient();
    const { data, error } = await supabaseSrv
      .from('profiles')
      .select('id, role_id, notif_preferences')
      .eq('id', profileId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error('❌ Failed to load profile notification summary:', error);
      }
      return null;
    }

    const roleId = Number(data.role_id);
    let preferences = (data.notif_preferences as NotificationPreferencesPayload | null) ?? null;

    if (!preferences || !preferences.events || Object.keys(preferences.events).length === 0) {
      const defaults = buildNotificationPreferences(roleId, null);
      const { data: updated, error: updateError } = await supabaseSrv
        .from('profiles')
        .update({
          notif_preferences: defaults,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId)
        .select('id, role_id, notif_preferences')
        .maybeSingle();

      if (updateError) {
        console.error('❌ Failed to seed default notification preferences:', updateError);
        preferences = defaults;
      } else if (updated) {
        preferences = (updated.notif_preferences as NotificationPreferencesPayload | null) ?? defaults;
      } else {
        preferences = defaults;
      }
    }

    return {
      id: data.id,
      role_id: roleId,
      notif_preferences: preferences,
    };
  } catch (err) {
    console.error('❌ Unexpected error loading profile notification summary:', err);
    return null;
  }
}

/** Server-side variant to be called in RSC pages (avoids exposing multiple round trips client-side). */
export async function getStudentsWithProgramsServer(): Promise<AdvisorStudentRow[]> {
  try {
    const supabaseSrv = await createSupabaseServerComponentClient();
    const { data: profiles, error: profilesError } = await supabaseSrv
      .from('profiles')
      .select('id, fname, lname')
      .eq('role_id', 3);
    if (profilesError || !profiles?.length) return [];

    const profileIds = profiles.map(p => p.id);
    const { data: students, error: studentsError } = await supabaseSrv
      .from('student')
      .select('profile_id, selected_programs')
      .in('profile_id', profileIds);
    if (studentsError) return profiles.map(p => ({ id: p.id, fname: p.fname, lname: p.lname, programs: '' }));

    const programIds = new Set<number>();
    const studentProgramsMap = new Map<string, number[]>();
    students?.forEach(s => {
      const list = Array.isArray(s.selected_programs) ? s.selected_programs.filter((x: any) => Number.isInteger(x)) : [];
      studentProgramsMap.set(s.profile_id, list);
      list.forEach(id => programIds.add(id));
    });

    let programNameMap = new Map<number, string>();
    if (programIds.size) {
      const { data: programs, error: programsError } = await supabaseSrv
        .from('program')
        .select('id, name')
        .in('id', Array.from(programIds));
      if (!programsError && programs) {
        programNameMap = new Map(programs.map(p => [p.id, p.name]));
      }
    }
    return profiles.map(p => {
      const ids = studentProgramsMap.get(p.id) || [];
      const names = ids.map(id => programNameMap.get(id)).filter(Boolean) as string[];
      return { id: p.id, fname: p.fname, lname: p.lname, programs: names.join(', ') };
    });
  } catch (e) {
    console.error('❌ Server fetch students failed:', e);
    return [];
  }
}
