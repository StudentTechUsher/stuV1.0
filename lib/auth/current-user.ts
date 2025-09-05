// lib/auth/current-user.ts
import "server-only";
import { ROLES, toRoleSlug, type RoleId, type RoleSlug } from "./roles";
import { createSupabaseServerClient } from "../server";

export type AppUser = {
  id: string;
  email: string | null;
  roleId: RoleId;
  role: RoleSlug;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = createSupabaseServerClient();

  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  if (getUserError) {
    console.error("Error fetching user:", getUserError);
    return null;
  }

  // Dev fallback (optional)
  if (!user && process.env.MOCK_DASHBOARD_ROLE) {
    const mock = process.env.MOCK_DASHBOARD_ROLE as RoleSlug;
    const roleId = (ROLES[mock] ?? ROLES.student) as RoleId;
    return { id: "mock-user", email: null, roleId, role: toRoleSlug(roleId) };
  }
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", user.id)
    .single();

  const roleId = (profile?.role_id ?? ROLES.student) as RoleId;
  return { id: user.id, email: user.email ?? null, roleId, role: toRoleSlug(roleId) };
}
