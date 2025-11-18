'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

interface GradPlanRealtimeListenerProps {
  userId: string;
}

/**
 * Component that listens to real-time changes on the grad_plan table
 * and shows a snackbar notification when a plan is created for the current user
 */
export default function GradPlanRealtimeListener({ userId }: Readonly<GradPlanRealtimeListenerProps>) {
  const router = useRouter();
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    planAccessId?: string;
  }>({
    open: false,
    message: '',
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    console.log('📡 Setting up real-time listener for grad_plan table, userId:', userId);

    // Subscribe to INSERT events on grad_plan table
    const channel = supabase
      .channel('grad-plan-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'grad_plan',
        },
        (payload) => {
          console.log('📡 ========================================');
          console.log('📡 REALTIME EVENT RECEIVED');
          console.log('📡 Event Type:', payload.eventType);
          console.log('📡 Timestamp:', new Date().toISOString());
          console.log('📡 Full Payload:', payload);
          console.log('📡 New Record:', payload.new);
          console.log('📡 Old Record:', payload.old);
          console.log('📡 ========================================');

          // Only show notification for INSERT events
          if (payload.eventType === 'INSERT') {
            // Check if this grad plan belongs to the current user
            // We need to get the student record to check the profile_id
            const checkStudentOwnership = async () => {
              const { data: student } = await supabase
                .from('student')
                .select('profile_id')
                .eq('id', payload.new.student_id)
                .single();

              console.log('📡 Student ownership check:', {
                student_id: payload.new.student_id,
                profile_id: student?.profile_id,
                current_userId: userId,
                matches: student?.profile_id === userId
              });

              if (student?.profile_id === userId) {
                // This grad plan belongs to the current user!
                setNotification({
                  open: true,
                  message: '🎓 Your graduation plan is ready!',
                  planAccessId: payload.new.access_id,
                });
              }
            };

            checkStudentOwnership();
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 ========================================');
        console.log('📡 SUBSCRIPTION STATUS CHANGE');
        console.log('📡 Status:', status);
        console.log('📡 Timestamp:', new Date().toISOString());
        if (err) {
          console.error('📡 Subscription Error:', err);
        }
        console.log('📡 ========================================');
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('📡 Cleaning up real-time listener');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleClose = () => {
    setNotification({ open: false, message: '' });
  };

  const handleViewPlan = () => {
    if (notification.planAccessId) {
      router.push(`/grad-plan/${notification.planAccessId}`);
    }
    handleClose();
  };

  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={10000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={handleClose}
        severity="success"
        sx={{ width: '100%' }}
        action={
          notification.planAccessId ? (
            <Button color="inherit" size="small" onClick={handleViewPlan}>
              View Plan
            </Button>
          ) : undefined
        }
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
}
