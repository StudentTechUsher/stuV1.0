'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
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
          console.log('Access denied: User is not an advisor');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {isCheckingRole ? 'Checking permissions...' : 'Loading pending graduation plans...'}
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      );
    }

    return <PlansToApproveTable plans={plans} onRowClick={handleRowClick} />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{
        fontFamily: '"Red Hat Display", sans-serif',
        fontWeight: 800,
        color: 'black',
        fontSize: '2rem',
        margin: 0,
        marginBottom: '24px'
      }}>
        Approve Graduation Plans
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review and approve graduation plans submitted by students.
      </Typography>

      {renderContent()}
    </Box>
  );
}