'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { SnackbarProvider, useSnackbar } from 'notistack';
import { supabase } from '@/lib/supabaseClient';

function AuthSessionSnack() {
  const { enqueueSnackbar } = useSnackbar();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      let minutesLeft: number | undefined;
      try {
        const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(
          decodeURIComponent(
            atob(b64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        );
        if (json?.exp) {
          minutesLeft = Math.max(0, Math.round((json.exp * 1000 - Date.now()) / 60000));
        }
      } catch { /* ignore */ }

      enqueueSnackbar(
        minutesLeft !== undefined
          ? `Signed in — JWT loaded (expires in ~${minutesLeft} min)`
          : 'Signed in — JWT loaded',
        { variant: 'success' }
      );
    })();
  }, [enqueueSnackbar]);

  return null;
}

export function SnackbarLayer({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <AuthSessionSnack />
      {children}
    </SnackbarProvider>
  );
}
