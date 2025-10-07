'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, BellRing, Loader2 } from 'lucide-react';
import type { NotificationPreferencesPayload } from '@/types/notification-preferences';
import { buildNotificationPreferences, getRoleEventConfig } from '@/helpers/notification-preferences';

type ChannelKey = 'push' | 'email';

interface NotificationPreferencesCardProps {
  profileId: string;
  roleId: number;
  initialPreferences?: NotificationPreferencesPayload | null;
}

export default function NotificationPreferencesCard({
  profileId,
  roleId,
  initialPreferences,
}: NotificationPreferencesCardProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const roleConfig = useMemo(() => getRoleEventConfig(roleId), [roleId]);

  const [preferences, setPreferences] = useState<NotificationPreferencesPayload>(() =>
    buildNotificationPreferences(roleId, initialPreferences ?? null),
  );
  const [isLoading, setIsLoading] = useState(!initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleConfig) return;
    if (!profileId) return;
    let isMounted = true;

    async function loadPreferences() {
      setIsLoading(true);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('notif_preferences')
        .eq('id', profileId)
        .maybeSingle();

      if (!isMounted) return;

      if (fetchError) {
        console.error('Failed to load notification preferences:', fetchError.message);
        setError('We could not load your preferences. Defaults are shown.');
        setPreferences(buildNotificationPreferences(roleId, null));
        setIsLoading(false);
        return;
      }

      const stored = (data?.notif_preferences as NotificationPreferencesPayload | null | undefined) ?? null;
      setPreferences(buildNotificationPreferences(roleId, stored));
      setError(null);
      setIsLoading(false);
    }

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [profileId, roleConfig, supabase, roleId]);

  const persistPreferences = useCallback(
    async (next: NotificationPreferencesPayload) => {
      setIsSaving(true);
      const payload = {
        notif_preferences: next,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', profileId);

      if (updateError) {
        console.error('Failed to save notification preferences:', updateError.message);
        setError('We could not save your updates. Try again.');
      } else {
        setError(null);
      }

      setIsSaving(false);
    },
    [profileId, supabase],
  );

  const handleToggle = useCallback(
    (event: string, channel: ChannelKey, checked: boolean) => {
      setPreferences((current) => {
        const nextEvents = {
          ...current.events,
          [event]: {
            ...current.events[event],
            [channel]: checked,
          },
        };

        const next: NotificationPreferencesPayload = {
          events: nextEvents,
        };

        void persistPreferences(next);
        return next;
      });
    },
    [persistPreferences],
  );

  if (!roleConfig || roleConfig.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you receive updates for key events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your preferences…
          </div>
        ) : (
          <div className="space-y-4">
            {roleConfig.map(({ event, label, description }) => (
              <div key={event} className="rounded-lg border p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium">{label}</h3>
                  {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['push', 'email'] satisfies ChannelKey[]).map((channel) => (
                    <div key={channel} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <Label htmlFor={`${event}-${channel}`} className="text-sm font-medium capitalize">
                        {channel}
                      </Label>
                      <Switch
                        id={`${event}-${channel}`}
                        checked={preferences.events[event]?.[channel] ?? false}
                        onCheckedChange={(checked) => handleToggle(event, channel, checked)}
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {isSaving && !isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving changes…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
