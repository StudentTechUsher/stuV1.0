'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { StuLoader } from '@/components/ui/StuLoader';
import PlansToApproveTable from '@/components/approve-grad-plans/plans-to-approve-table';
import type { PendingGradPlan } from '@/types/pending-grad-plan';
import { fetchPendingGradPlans, issueGradPlanAccessId } from '@/lib/services/server-actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

export default function SelectGradPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = React.useState<PendingGradPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = React.useState(true);

  const supabase = createSupabaseBrowserClient();

  // Check if user is an advisor before allowing access
  React.useEffect(() => {
    async function checkUserRole() {
      try {
        // Get the current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          console.error('Error getting session:', sessionError);
          router.push('/home');
          return;
        }

        // Fetch the user's profile to get their role_id
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          router.push('/home');
          return;
        }

        // Check if user is an advisor (role_id = 2)
        const role: Role = ROLE_MAP[profile?.role_id ?? "3"];
        
        if (role !== "advisor") {
          router.push('/home');
          return;
        }

        // User is an advisor, allow access
        setIsCheckingRole(false);
      } catch (error) {
        console.error('Error checking user role:', error);
        router.push('/home');
      }
    }

    checkUserRole();
  }, [router, supabase]);

  React.useEffect(() => {
    // Don't fetch data until role check is complete
    if (isCheckingRole) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fetchedPlans = await fetchPendingGradPlans();
        
        if (!active) return;
        setPlans(fetchedPlans);
      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('Failed to load pending graduation plans');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isCheckingRole]);

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