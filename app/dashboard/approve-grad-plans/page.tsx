'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import PlansToApproveTable from '@/components/approve-grad-plans/plans-to-approve-table';
import type { PendingGradPlan } from '@/types/pending-grad-plan';
import { fetchPendingGradPlans } from '@/lib/api/server-actions';
import { encodeAccessIdClient } from '@/lib/utils/access-id';

export default function SelectGradPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = React.useState<PendingGradPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
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
  }, []);

  const handleRowClick = (plan: PendingGradPlan) => {
    try {
      // Encode the grad plan ID to create a secure access ID
      const accessId = encodeAccessIdClient(plan.id);
      
      // Navigate to the dynamic route with the encoded access ID
      router.push(`/dashboard/approve-grad-plans/${accessId}`);
    } catch (error) {
      console.error('Error navigating to grad plan:', error);
      setError('Failed to open graduation plan');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading pending graduation plans...
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
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Approve Graduation Plans
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review and approve graduation plans submitted by students.
      </Typography>

      {renderContent()}
    </Box>
  );
}