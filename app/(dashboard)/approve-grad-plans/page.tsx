import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { fetchPendingGradPlans } from '@/lib/services/server-actions';
import PlansToApproveTable from '@/components/approve-grad-plans/plans-to-approve-table';
import { CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

export default async function ApproveGradPlansPage() {
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

  // Check if user is an advisor (role_id = 2)
  const role: Role = ROLE_MAP[profile?.role_id ?? "3"];

  if (role !== "advisor") {
    console.log('Access denied: User is not an advisor');
    redirect('/home');
  }

  // Fetch pending graduation plans
  const plans = await fetchPendingGradPlans();

  return (
    <main className="p-4 sm:p-6 space-y-6">
      {/* Modern Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-header-bold text-3xl sm:text-4xl font-bold text-[#0A0A0A]">
            Approve Graduation Plans
          </h1>
          <p className="font-body text-sm text-[var(--muted-foreground)] mt-2">
            Review and approve graduation plans submitted by students
          </p>
        </div>

        {/* Stats Badge */}
        <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 shadow-sm">
          <CheckCircle2 size={20} className="text-[#0A0A0A]" />
          <span className="font-body-semi text-sm text-[#0A0A0A]">
            <span className="font-bold">{plans.length}</span> {plans.length === 1 ? 'Plan' : 'Plans'} Pending
          </span>
        </div>
      </div>

      {/* Plans Table */}
      <PlansToApproveTable plans={plans} />
    </main>
  );
}