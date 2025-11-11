import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { fetchPendingGradPlans } from '@/lib/services/server-actions';
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { StuLoader } from '@/components/ui/StuLoader';
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
        // Check if user is an advisor (role_id = 2)
        const role: Role = ROLE_MAP[profile?.role_id ?? "3"];
        
        if (role !== "advisor") {
          router.push('/home');
          return;
        }

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
  const handleRowClick = async (plan: PendingGradPlan) => {
    try {
      const accessId = await issueGradPlanAccessId(plan.id);
      router.push(`/dashboard/approve-grad-plans/${accessId}`);
    } catch (error) {
      console.error('Error navigating to grad plan:', error);
      setError('Failed to open graduation plan');
    }
  };

  const renderContent = () => {
    if (isCheckingRole || loading) {
      return (
        <div className="flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-12 shadow-sm">
          <StuLoader
            variant="card"
            text={isCheckingRole ? 'Checking permissions...' : 'Loading pending graduation plans...'}
          />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-red-900">Error</h3>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    return <PlansToApproveTable plans={plans} onRowClick={handleRowClick} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color-mix(in_srgb,var(--muted)_20%,transparent)] to-transparent">
      <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Modern page header */}
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-header)] font-extrabold text-4xl text-[var(--foreground)] tracking-tight">
            Approve Graduation Plans
          </h1>
          <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
            Review and approve graduation plans submitted by students.
          </p>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}