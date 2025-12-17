import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { fetchPendingStudents } from '@/lib/services/profileService.server';
import PendingStudentsTable from '@/components/approve-students/pending-students-table';
import { UserCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

export default async function ApproveStudentsPage() {
  const supabase = await createSupabaseServerComponentClient();

  // Get the current user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    redirect('/home');
  }

  // Fetch the user's profile to get their role_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    redirect('/home');
  }

  // Check if user is an advisor or admin (role_id = 1 or 2)
  const role: Role = ROLE_MAP[profile?.role_id ?? "3"];

  if (role !== "advisor" && role !== "admin") {
    console.log('Access denied: User is not an advisor or admin');
    redirect('/home');
  }

  // Fetch pending students
  const students = await fetchPendingStudents();

  return (
    <main className="p-4 sm:p-6 space-y-6">
      {/* Modern Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-header-bold text-3xl sm:text-4xl font-bold text-[#0A0A0A]">
            Approve Students
          </h1>
          <p className="font-body text-sm text-[var(--muted-foreground)] mt-2">
            Review and approve student registrations
          </p>
        </div>

        {/* Stats Badge */}
        <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 shadow-sm">
          <UserCheck size={20} className="text-[#0A0A0A]" />
          <span className="font-body-semi text-sm text-[#0A0A0A]">
            <span className="font-bold">{students.length}</span> {students.length === 1 ? 'Student' : 'Students'} Pending
          </span>
        </div>
      </div>

      {/* Students Table */}
      <PendingStudentsTable students={students} />
    </main>
  );
}
