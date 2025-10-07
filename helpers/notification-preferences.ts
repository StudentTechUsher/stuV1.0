import type { ChannelPreferences, NotificationPreferencesPayload } from '@/types/notification-preferences';

interface EventConfig {
  event: string;
  label: string;
  description?: string;
  defaultPreferences: ChannelPreferences;
}

const ROLE_EVENT_CONFIG: Record<number, EventConfig[]> = {
  1: [
    {
      event: 'forecast.new_available',
      label: 'Forecast available',
      description: 'Get notified when new enrollment forecasts are ready.',
      defaultPreferences: { push: false, email: true },
    },
    {
      event: 'inbox.new',
      label: 'Inbox notifications',
      description: 'Messages and updates sent to the shared admin inbox.',
      defaultPreferences: { push: true, email: true },
    },
  ],
  2: [
    {
      event: 'grad_plan.new',
      label: 'New grad plan',
      description: 'Alerts when a student submits a plan that needs review.',
      defaultPreferences: { push: true, email: true },
    },
    {
      event: 'report.new',
      label: 'New report available',
      description: 'Weekly or on-demand reports produced for your advisees.',
      defaultPreferences: { push: false, email: true },
    },
    {
      event: 'inbox.new',
      label: 'Inbox notifications',
      description: 'Messages and updates that land in your STU inbox.',
      defaultPreferences: { push: true, email: true },
    },
  ],
  3: [
    {
      event: 'grad_plan.updated',
      label: 'Grad plan updated',
      description: 'Changes made to your current graduation plan.',
      defaultPreferences: { push: true, email: false },
    },
    {
      event: 'scheduling_automation.updated',
      label: 'Scheduling automation updates',
      description: 'Status updates from the scheduling assistant.',
      defaultPreferences: { push: true, email: true },
    },
    {
      event: 'inbox.new',
      label: 'Inbox notifications',
      description: 'Messages and nudges inside the STU inbox.',
      defaultPreferences: { push: true, email: true },
    },
  ],
};

export function getRoleEventConfig(roleId: number): EventConfig[] {
  return ROLE_EVENT_CONFIG[roleId] ?? [];
}

export function buildNotificationPreferences(roleId: number, stored: NotificationPreferencesPayload | null): NotificationPreferencesPayload {
  const roleConfig = getRoleEventConfig(roleId);
  const storedEvents = stored?.events ?? {};
  const events: Record<string, ChannelPreferences> = { ...storedEvents };

  if (roleConfig.length === 0) {
    return stored ?? { events: {} };
  }

  roleConfig.forEach(({ event, defaultPreferences }) => {
    const existing = storedEvents[event];
    events[event] = {
      push: existing?.push ?? defaultPreferences.push,
      email: existing?.email ?? defaultPreferences.email,
    };
  });

  return { events };
}

export type { EventConfig };
